import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import EnhancedChatWindow from "./components/chat/EnhancedChatWindow";
import SidePanel from "./components/SidePanel";
import AppLayout from "./components/layout/AppLayout";
import SettingsPanel from "./components/layout/SettingsPanel";
import type { SidebarSection } from "./components/layout/Sidebar";
import WorkspaceProvider, { useWorkspace } from "./contexts/WorkspaceContext";
import ChatProvider, { useChat } from "./contexts/ChatContext";
import ThemeProvider from "./contexts/ThemeContext";
import {
  Message,
  Model,
  Role,
  User,
  StreamingResponse,
  ModelConfig,
} from "./types";
import { useLocalDB } from "./hooks/useLocalDB";
import { learningService } from "./services/LearningService";
import { chatService } from "./services/ChatService";
import { modelService } from "./services/ModelService";
import { commandService } from "./services/CommandService";
import { createId } from "./utils/ids";
import {
  USERS,
  ASSISTANT_USER,
  MAX_CONCURRENT_MODELS,
} from "./constants";

const sortModelsForDisplay = (models: ModelConfig[]) => {
  const priority = (model: ModelConfig) => {
    switch (model.origin) {
      case "mock":
        return -1;
      case "lmstudio":
        return 0;
      case "remote-default":
        return 1;
      case "custom":
      default:
        return 2;
    }
  };
  return [...models].sort((a, b) => priority(a) - priority(b) || a.label.localeCompare(b.label));
};

const AppContent: React.FC = () => {
  const { activeWorkspace } = useWorkspace();
  const { activeChat, messages, addMessage, isStreaming, setIsStreaming } = useChat();
  const {
    memoryFacts,
    addFact,
    deleteFact,
    updateFact,
    findRelevantFacts,
    cacheStats,
  } = useLocalDB(activeWorkspace?.id);

  // Initialize learning service with workspace facts
  useEffect(() => {
    learningService.initialize(memoryFacts);
  }, [memoryFacts]);

  // Model management
  const [isOffline, setIsOffline] = useState(true);
  const [currentUser] = useState<User>(USERS[0]);
  const [lmStudioStatus, setLmStudioStatus] = useState<"offline" | "online" | "error">("offline");
  const [lmStudioModels, setLmStudioModels] = useState<ModelConfig[]>([]);
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [activeStreams, setActiveStreams] = useState<Record<string, StreamingResponse>>({});
  const streamControllersRef = useRef<Record<string, AbortController>>({});

  // Settings panel state
  const [isSettingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'prompts' | 'skills' | 'tools' | 'commands'>('prompts');

  // Get workspace-specific models
  const baseModels = useMemo(() => {
    const builtinModels = modelService.getBuiltinModels();
    const workspaceModels = activeWorkspace
      ? modelService.getWorkspaceModels(activeWorkspace.id)
      : modelService.getAllModels();

    const map = new Map<string, ModelConfig>();
    [...builtinModels, ...lmStudioModels, ...workspaceModels].forEach(model => {
      map.set(model.id, model);
    });
    return Array.from(map.values());
  }, [lmStudioModels, activeWorkspace]);

  const availableModels = useMemo(() => {
    const filtered = baseModels.filter(model =>
      isOffline ? model.provider === "mock" : model.provider !== "mock",
    );
    return sortModelsForDisplay(filtered);
  }, [baseModels, isOffline]);

  // Auto-select available models
  useEffect(() => {
    setSelectedModels(prev => {
      const allowedIds = availableModels.map(model => model.id);
      const filtered = prev.filter(id => allowedIds.includes(id));
      const fallback = allowedIds.slice(0, MAX_CONCURRENT_MODELS);
      if (filtered.length === fallback.length && filtered.every((id, index) => id === fallback[index])) {
        return filtered;
      }
      return filtered.length > 0 ? filtered : fallback;
    });
  }, [availableModels]);

  // Discover LM Studio models
  useEffect(() => {
    if (isOffline) {
      setLmStudioStatus("offline");
      setLmStudioModels([]);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const fetchModels = async () => {
      try {
        const discovered = await modelService.discoverLMStudioModels();
        if (!cancelled) {
          setLmStudioModels(discovered);
          setLmStudioStatus(discovered.length > 0 ? "online" : "error");
        }
      } catch (error) {
        if (!cancelled) {
          setLmStudioStatus("error");
        }
      }
    };

    fetchModels();
    const interval = setInterval(fetchModels, 10000);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, [isOffline]);

  // Handle sending messages
  const handleSendMessage = useCallback(
    async (rawContent: string) => {
      if (!activeChat || isStreaming) return;

      const trimmedContent = rawContent.trim();
      if (!trimmedContent) return;

      // Check if it's a slash command
      if (trimmedContent.startsWith('/')) {
        const commandName = trimmedContent.slice(1).split(' ')[0];
        const command = commandService.getCommandByName(commandName);

        if (command) {
          try {
            const result = await commandService.executeCommand(commandName, {});

            // Add command result as system message
            addMessage(activeChat.id, {
              role: Role.System,
              senderId: 'system',
              senderName: 'System',
              content: typeof result === 'string' ? result : JSON.stringify(result),
              modelId: 'system',
              modelLabel: 'System',
            });
            return;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addMessage(activeChat.id, {
              role: Role.System,
              senderId: 'system',
              senderName: 'System',
              content: `Error executing command: ${errorMessage}`,
              modelId: 'system',
              modelLabel: 'System',
            });
            return;
          }
        }
      }

      setIsStreaming(true);

      // Add user message
      const userMessage = addMessage(activeChat.id, {
        role: Role.User,
        senderId: currentUser.id,
        senderName: currentUser.name,
        content: trimmedContent,
      });

      try {
        // Find relevant facts for context
        const relevantFacts = await findRelevantFacts(trimmedContent, 5);

        // Get selected model
        const modelConfig = availableModels.find(m => m.id === selectedModels[0]) ||
                          modelService.getDefaultModel(activeWorkspace?.id);

        // Stream completion
        let fullResponse = '';
        const responseId = createId();

        setActiveStreams(prev => ({
          ...prev,
          [responseId]: {
            id: responseId,
            modelId: modelConfig.id,
            modelLabel: modelConfig.label,
            content: '',
            status: 'streaming',
          }
        }));

        const controller = new AbortController();
        streamControllersRef.current[responseId] = controller;

        await chatService.streamCompletion({
          prompt: trimmedContent,
          model: modelConfig,
          currentUser,
          participants: USERS,
          context: messages,
          memory: relevantFacts,
          workspace: activeWorkspace || undefined,
          signal: controller.signal,
          callbacks: {
            onToken: (token: string) => {
              fullResponse += token;
              setActiveStreams(prev => ({
                ...prev,
                [responseId]: {
                  ...prev[responseId],
                  content: fullResponse,
                  status: 'streaming',
                }
              }));
            },
            onComplete: (finalText: string) => {
              // Add assistant message
              addMessage(activeChat.id, {
                role: Role.Assistant,
                senderId: ASSISTANT_USER.id,
                senderName: modelConfig.label,
                content: finalText,
                modelId: modelConfig.id,
                modelLabel: modelConfig.label,
              });

              // Extract facts from conversation
              const extractedFacts = learningService.extractFactsFromConversation(
                userMessage as Message,
                { content: finalText } as Message,
                currentUser
              );

              // Add extracted facts
              extractedFacts.forEach(fact => {
                addFact(fact);
                learningService.addFact(fact);
              });

              // Clean up stream
              setActiveStreams(prev => {
                const updated = { ...prev };
                delete updated[responseId];
                return updated;
              });
              delete streamControllersRef.current[responseId];
              setIsStreaming(false);
            },
            onError: (error: string) => {
              // Add error message
              addMessage(activeChat.id, {
                role: Role.System,
                senderId: 'system',
                senderName: 'System',
                content: `Error: ${error}`,
                modelId: 'system',
                modelLabel: 'System',
              });

              // Clean up stream
              setActiveStreams(prev => {
                const updated = { ...prev };
                delete updated[responseId];
                return updated;
              });
              delete streamControllersRef.current[responseId];
              setIsStreaming(false);
            }
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        setIsStreaming(false);
      }
    },
    [activeChat, isStreaming, currentUser, messages, findRelevantFacts,
     availableModels, selectedModels, activeWorkspace, addMessage, setIsStreaming, addFact]
  );

  // Handle command execution from command palette
  const handleExecuteCommand = useCallback(async (commandId: string) => {
    try {
      const result = await commandService.executeCommand(commandId);
      console.log('Command executed:', result);
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  }, []);

  // Handle sidebar navigation
  const handleSidebarNavigate = useCallback((section: SidebarSection) => {
    if (section === 'skills' || section === 'tools' || section === 'commands' || section === 'settings') {
      setSettingsSection(section === 'settings' ? 'prompts' : section);
      setSettingsPanelOpen(true);
    }
  }, []);

  // Get learning stats for side panel
  const learningStats = useMemo(() => {
    const stats = learningService.getStats();
    return {
      totalFacts: stats.totalFacts,
      autoExtractedFacts: stats.autoExtractedFacts,
      avgConfidence: stats.avgConfidence,
      totalToolExecutions: 0,
      toolSuccessRate: 0,
    };
  }, [memoryFacts]);

  const clusterSummary = useMemo(() => {
    return learningService.getClusterSummary();
  }, [memoryFacts]);

  // Active chat messages
  const activeMessages = useMemo(() => messages, [messages]);

  // Convert streaming responses to messages for display
  const streamingMessages = useMemo(() => {
    if (!activeChat) return [];
    return Object.values(activeStreams).map(stream => ({
      id: stream.id,
      chat_id: activeChat.id,
      role: Role.Assistant,
      senderId: ASSISTANT_USER.id,
      senderName: stream.modelLabel,
      content: stream.content,
      modelId: stream.modelId,
      modelLabel: stream.modelLabel,
      created_at: new Date().toISOString(),
    } as Message));
  }, [activeStreams, activeChat]);

  const allMessages = useMemo(() => {
    return [...activeMessages, ...streamingMessages];
  }, [activeMessages, streamingMessages]);

  return (
    <AppLayout
      onExecuteCommand={handleExecuteCommand}
      onSidebarNavigate={handleSidebarNavigate}
    >
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <EnhancedChatWindow
            messages={allMessages}
            onSendMessage={handleSendMessage}
            lmStudioStatus={lmStudioStatus}
          />
        </div>
        <SidePanel
          memoryFacts={memoryFacts}
          onDeleteFact={deleteFact}
          onAddFact={addFact}
          cacheStats={cacheStats}
          cacheSize={Object.keys(cacheStats).length}
          learningStats={learningStats}
          clusterSummary={clusterSummary}
        />
      </div>

      <SettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
        initialSection={settingsSection}
      />
    </AppLayout>
  );
};

const App: React.FC = () => {
  return (
    <WorkspaceProvider>
      <ChatProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </ChatProvider>
    </WorkspaceProvider>
  );
};

export default App;
