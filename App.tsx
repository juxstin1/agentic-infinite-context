import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Header from "./components/Header";
import ChatWindow from "./components/ChatWindow";
import EnhancedChatWindow from "./components/chat/EnhancedChatWindow";
import InputBar from "./components/InputBar";
import SidePanel from "./components/SidePanel";
import ChatListPanel from "./components/ChatListPanel";
import ModelManagerModal from "./components/ModelManagerModal";
import AppLayout from "./components/layout/AppLayout";
import SettingsPanel from "./components/layout/SettingsPanel";
import type { SidebarSection } from "./components/layout/Sidebar";
import {
  Message,
  Model,
  Role,
  User,
  Chat,
  MemoryFact,
  StreamingResponse,
  ModelConfig,
} from "./types";
import { getMockAiResponse, streamChatCompletion } from "./services/aiService";
import { useLocalDB } from "./hooks/useLocalDB";
import { useModelManager } from "./hooks/useModelManager";
import { RecursiveLearningEngine } from "./services/recursiveLearningEngine";
import crypto from "crypto-js";
import {
  USERS,
  ASSISTANT_USER,
  MAX_CONCURRENT_MODELS,
  PROVIDER_DEFAULT_ENDPOINT,
} from "./constants";

const LM_STUDIO_MODELS_ENDPOINT = "http://localhost:1234/v1/models";
const MENTION_REGEX = /@([a-z0-9_-]+)/gi;

const normalizeHandle = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const extractMentionedAgentIds = (input: string, agents: ModelConfig[]): string[] => {
  const handles = new Set<string>();
  let match;
  while ((match = MENTION_REGEX.exec(input)) !== null) {
    handles.add(normalizeHandle(match[1]));
  }
  if (handles.size === 0) return [];

  const result: string[] = [];
  const seen = new Set<string>();
  agents.forEach(agent => {
    if (seen.has(agent.id)) {
      return;
    }
    const tokens = [normalizeHandle(agent.label), normalizeHandle(agent.id)];
    if (agent.model) {
      tokens.push(normalizeHandle(agent.model));
    }
    if (tokens.some(token => handles.has(token))) {
      result.push(agent.id);
      seen.add(agent.id);
    }
  });
  return result;
};

const buildThreadSummary = (history: Message[]): string => {
  const recent = history.filter(msg => msg.role === Role.User).slice(-5);
  if (recent.length === 0) {
    return "";
  }
  return recent.map(msg => `${msg.senderName}: ${msg.content}`).join("\n");
};

const buildAgentSystemPrompt = (
  name: string,
  peerNames: string[],
  attempt: number,
): string => {
  const peerList = peerNames.length ? ` (${[name, ...peerNames].join(", ")})` : "";
  let base = peerNames.length
    ? `You are ${name}. Multiple assistants may be present${peerList}. Start every reply with "[${name}]:" exactly. Never claim to be any other assistant.`
    : `You are ${name}. You are the only assistant in this chat. Start every reply with "[${name}]:" exactly.`;

  base += "\nFocus on the user's request. Keep replies concise. Do not discuss identity unless the user asks.";

  if (attempt > 0) {
    base += `\n\nReminder: Your last reply did not start correctly. Begin this response with "[${name}]:" and do not mention the correction.`;
  }

  base += "\nAvoid emojis unless the user uses them first.";

  return base;
};

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

const App: React.FC = () => {
  const {
    chats,
    messages,
    memoryFacts,
    cache,
    toolMemories,
    activeChatId,
    setActiveChatId,
    addMessage,
    addFact,
    deleteFact,
    updateFact,
    addToolMemory,
    addFeedback,
    getCacheEntry,
    setCacheEntry,
    createChat,
    findRelevantFacts,
    embeddingStatus,
    dbStatus,
    setMemoryFacts,
    setToolMemories,
  } = useLocalDB();

  // Initialize recursive learning engine
  const learningEngineRef = useRef<RecursiveLearningEngine | null>(null);

  useEffect(() => {
    if (!learningEngineRef.current) {
      learningEngineRef.current = new RecursiveLearningEngine();
    }
    learningEngineRef.current.initialize(memoryFacts, toolMemories);
  }, [memoryFacts, toolMemories]);

  // Sync learning engine changes back to localStorage
  const syncLearningEngine = useCallback(() => {
    if (learningEngineRef.current) {
      setMemoryFacts(learningEngineRef.current.getFacts());
      setToolMemories(learningEngineRef.current.getToolMemories());
    }
  }, [setMemoryFacts, setToolMemories]);

  // Handle tool execution
  const handleExecuteTool = useCallback(
    async (toolCall: any, messageId: string) => {
      if (!learningEngineRef.current || !activeChatId) return;

      const toolEngine = learningEngineRef.current.getToolEngine();
      const result = await toolEngine.executeTool(
        toolCall.name,
        toolCall.args,
        `Executed from message ${messageId}`
      );

      // Add result as a system message
      const resultMessage: Message = {
        id: crypto.lib.WordArray.random(16).toString(),
        chat_id: activeChatId,
        role: Role.System,
        senderId: "system",
        senderName: "System",
        content: result.success
          ? `✓ Tool "${toolCall.name}" executed successfully:\n${result.output}`
          : `✗ Tool "${toolCall.name}" failed:\n${result.error}`,
        modelId: "system",
        modelLabel: "System",
        created_at: new Date().toISOString(),
      };

      addMessage(resultMessage);
      syncLearningEngine();
    },
    [activeChatId, addMessage, syncLearningEngine]
  );

  // Handle user feedback
  const handleFeedback = useCallback(
    (messageId: string, thumbsUp: boolean) => {
      if (!learningEngineRef.current) return;

      const feedback = {
        message_id: messageId,
        thumbs_up: thumbsUp,
        thumbs_down: !thumbsUp,
        created_at: new Date().toISOString(),
      };

      learningEngineRef.current.recordFeedback(feedback);
      addFeedback(feedback);

      // Reinforce facts if positive feedback
      if (thumbsUp) {
        const message = messages.find(m => m.id === messageId);
        if (message) {
          // This is a simple implementation - could be enhanced to track which facts were used
          console.log('Positive feedback recorded for message:', message.id);
        }
      }
    },
    [addFeedback, messages]
  );

  const { builtinModels, mergeWithBase, addModel, updateModel, removeModel } = useModelManager();

  const [isOffline, setIsOffline] = useState(true);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });
  const [currentUser, setCurrentUser] = useState<User>(USERS[0]);
  const [lmStudioStatus, setLmStudioStatus] = useState<"offline" | "online" | "error">("offline");
  const [lmStudioModels, setLmStudioModels] = useState<ModelConfig[]>([]);
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [activeStreams, setActiveStreams] = useState<Record<string, StreamingResponse>>({});
  const [lastRoutedAgents, setLastRoutedAgents] = useState<string[]>([]);
  const streamControllers = useRef<Record<string, AbortController>>({});
  const pendingStreamCount = useRef(0);
  const pendingOfflineCount = useRef(0);
  const [hasPendingWork, setHasPendingWork] = useState(false);
  const [isModelManagerOpen, setModelManagerOpen] = useState(false);
  const [isSettingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'prompts' | 'skills' | 'tools'>('prompts');

  useEffect(() => {
    if (chats.length === 0) {
      const newChat = createChat("New Group Chat", USERS);
      setActiveChatId(newChat.id);
    }
  }, [chats.length, createChat, setActiveChatId]);

  const baseModels = useMemo(() => {
    const map = new Map<string, ModelConfig>();
    [...builtinModels, ...lmStudioModels].forEach(model => {
      map.set(model.id, model);
    });
    return Array.from(map.values());
  }, [builtinModels, lmStudioModels]);

  const mergedModels = useMemo(() => mergeWithBase(baseModels), [mergeWithBase, baseModels]);

  const availableModels = useMemo(() => {
    const filtered = mergedModels.filter(model =>
      isOffline ? model.provider === "mock" : model.provider !== "mock",
    );
    return sortModelsForDisplay(filtered);
  }, [mergedModels, isOffline]);

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

  useEffect(() => {
    let cancelled = false;
    if (isOffline) {
      setLmStudioStatus("offline");
      setLmStudioModels([]);
      return;
    }

    const controller = new AbortController();

    const fetchModels = async () => {
      try {
        const response = await fetch(LM_STUDIO_MODELS_ENDPOINT, { signal: controller.signal });
        if (!response.ok) {
          if (!cancelled) {
            setLmStudioStatus("error");
          }
          return;
        }
        const payload = await response.json();
        const items: any[] = Array.isArray(payload?.data) ? payload.data : [];
        const discovered = items
          .map((item, index) => {
            const id = (item?.id || item?.name || item?.model || `model-${index}`).toString();
            return {
              id,
              label: item?.id || item?.name || id,
              provider: "lmstudio" as const,
              model: id,
              endpoint: PROVIDER_DEFAULT_ENDPOINT.lmstudio,
              streamingProtocol: "sse" as const,
              useRag: true,
              isDefault: true,
              origin: "lmstudio" as const,
            } satisfies ModelConfig;
          })
          .filter((model, index, arr) => arr.findIndex(other => other.id === model.id) === index);

        if (!cancelled) {
          setLmStudioStatus("online");
          setLmStudioModels(discovered);
        }
      } catch (error) {
        if (!cancelled && !controller.signal.aborted) {
          console.error("Failed to fetch LM Studio models", error);
          setLmStudioStatus("error");
          setLmStudioModels([]);
        }
      }
    };

    fetchModels();
    const interval = setInterval(fetchModels, 15_000);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, [isOffline]);

  const finalizeWorkIfIdle = useCallback(() => {
    if (pendingStreamCount.current === 0 && pendingOfflineCount.current === 0) {
      setHasPendingWork(false);
    }
  }, []);

  const startStream = useCallback(
    (
      modelConfig: ModelConfig,
      prompt: string,
      normalizedPrompt: string,
      chat: Chat | null,
      agentContext: Message[],
      relevantFacts: MemoryFact[],
      activeChatIdValue: string,
      threadSummary: string,
      scheduledAgents: string[],
    ) => {
      const modelLabel = modelConfig.label;
      const targetModel = modelConfig.model || modelConfig.id;
      const endpoint =
        modelConfig.provider === "mock"
          ? ""
          : modelConfig.endpoint || PROVIDER_DEFAULT_ENDPOINT[modelConfig.provider] || "";

      if (modelConfig.provider !== "mock" && !endpoint) {
        const moderatorMessage: Message = {
          id: crypto.lib.WordArray.random(16).toString(),
          chat_id: activeChatIdValue,
          role: Role.System,
          senderId: "moderator",
          senderName: "System",
          content: `The model ${modelLabel} is missing an endpoint. Open Manage models to configure it.`,
          modelId: "moderator",
          modelLabel: "System",
          created_at: new Date().toISOString(),
        };
        addMessage(moderatorMessage);
        finalizeWorkIfIdle();
        return;
      }

      const streamId = crypto.lib.WordArray.random(16).toString();
      const cacheKey = crypto.SHA256(
        JSON.stringify({ model: modelConfig.id, prompt: normalizedPrompt }),
      ).toString();

      const controller = new AbortController();
      streamControllers.current[streamId] = controller;
      pendingStreamCount.current += 1;

      setActiveStreams(prev => ({
        ...prev,
        [streamId]: {
          id: streamId,
          modelId: modelConfig.id,
          modelLabel,
          content: "",
          status: "streaming",
        },
      }));

      const runAttempt = async (attempt: number): Promise<boolean> => {
        let finalText = "";
        let encounteredError: string | null = null;
        await streamChatCompletion({
          prompt,
          model: targetModel,
          endpoint,
          apiKey: modelConfig.apiKey,
          headers: modelConfig.headers,
          streamingProtocol: modelConfig.streamingProtocol || "sse",
          currentUser,
          participants: chat?.participants ?? [],
          context: agentContext,
          memory: modelConfig.useRag === false ? [] : relevantFacts,
          summary: threadSummary,
          systemPromptOverride: buildAgentSystemPrompt(
            modelLabel,
            scheduledAgents.filter(name => name !== modelLabel),
            attempt,
          ),
          signal: controller.signal,
          onToken: token => {
            finalText += token;
            setActiveStreams(prev => {
              const current = prev[streamId];
              if (!current || current.status !== "streaming") {
                return prev;
              }
              return {
                ...prev,
                [streamId]: {
                  ...current,
                  content: current.content + token,
                },
              };
            });
          },
          onComplete: text => {
            finalText = text;
          },
          onError: message => {
            encounteredError = message;
          },
        });

        if (encounteredError) {
          setActiveStreams(prev => ({
            ...prev,
            [streamId]: {
              id: streamId,
              modelId: modelConfig.id,
              modelLabel,
              content: encounteredError!,
              status: "error",
              error: encounteredError!,
            },
          }));
          return false;
        }

        const trimmed = finalText.trim();
        const expectedPrefix = `[${modelLabel}]`;

        if (!trimmed.startsWith(expectedPrefix)) {
          if (attempt === 0) {
            setActiveStreams(prev => ({
              ...prev,
              [streamId]: {
                id: streamId,
                modelId: modelConfig.id,
                modelLabel,
                content: "",
                status: "streaming",
              },
            }));
            return runAttempt(attempt + 1);
          }

          setActiveStreams(prev => ({
            ...prev,
            [streamId]: {
              id: streamId,
              modelId: modelConfig.id,
              modelLabel,
              content: "Identity issue.",
              status: "error",
              error: "Identity mismatch",
            },
          }));

          const moderatorMessage: Message = {
            id: crypto.lib.WordArray.random(16).toString(),
            chat_id: activeChatIdValue,
            role: Role.System,
            senderId: "moderator",
            senderName: "System",
            content: `Identity validation failed for ${modelLabel}. Try mentioning @${normalizeHandle(modelLabel)} directly in your message.`,
            modelId: "moderator",
            modelLabel: "System",
            created_at: new Date().toISOString(),
          };

          addMessage(moderatorMessage);
          return false;
        }

        setActiveStreams(prev => {
          const next = { ...prev };
          delete next[streamId];
          return next;
        });

        // Strip the identity prefix after validation
        const cleanContent = trimmed.replace(/^\[.*?\]:\s*/, '').trim();

        const assistantMessage: Message = {
          id: crypto.lib.WordArray.random(16).toString(),
          chat_id: activeChatIdValue,
          role: Role.Assistant,
          senderId: ASSISTANT_USER.id,
          senderName: `${ASSISTANT_USER.name} (${modelLabel})`,
          content: cleanContent,
          modelId: modelConfig.id,
          modelLabel,
          created_at: new Date().toISOString(),
        };

        addMessage(assistantMessage);
        setCacheEntry(cacheKey, {
          ...assistantMessage,
          id: crypto.lib.WordArray.random(16).toString(),
        });

        return true;
      };

      runAttempt(0)
        .catch(error => {
          console.error("Streaming request failed", error);
          setActiveStreams(prev => ({
            ...prev,
            [streamId]: {
              id: streamId,
              modelId: modelConfig.id,
              modelLabel,
              content: "Streaming failed.",
              status: "error",
              error: "Streaming failed.",
            },
          }));
        })
        .finally(() => {
          delete streamControllers.current[streamId];
          pendingStreamCount.current = Math.max(0, pendingStreamCount.current - 1);
          finalizeWorkIfIdle();
        });
    },
    [addMessage, currentUser, finalizeWorkIfIdle, setCacheEntry],
  );

  const handleSendMessage = useCallback(
    async (rawContent: string) => {
      if (!activeChatId || hasPendingWork) return;

      const trimmedContent = rawContent.trim();
      if (!trimmedContent) return;

      setHasPendingWork(true);
      pendingStreamCount.current = 0;
      pendingOfflineCount.current = 0;

      const normalizedPrompt = trimmedContent.toLowerCase();
      const userMessage: Message = {
        id: crypto.lib.WordArray.random(16).toString(),
        chat_id: activeChatId,
        role: Role.User,
        senderId: currentUser.id,
        senderName: currentUser.name,
        content: trimmedContent,
        created_at: new Date().toISOString(),
      };
      addMessage(userMessage);

      const updatedHistory = [...messages, userMessage].filter(message => message.chat_id === activeChatId);
      const threadSummary = buildThreadSummary(updatedHistory);
      const contextWindow = updatedHistory.slice(-20);

      // Use semantic search from learning engine instead of keyword search
      const relevantFacts = learningEngineRef.current
        ? learningEngineRef.current.findRelevantFacts(normalizedPrompt, 6)
        : await findRelevantFacts(normalizedPrompt);
      const activeChat = chats.find(chat => chat.id === activeChatId) ?? null;

      const mentioned = extractMentionedAgentIds(trimmedContent, availableModels);

      const modelMap = new Map(mergedModels.map(model => [model.id, model] as const));
      const candidateIds =
        mentioned.length > 0
          ? mentioned
          : selectedModels.length > 0
            ? selectedModels
            : availableModels.map(model => model.id);

      const modelsForRun = candidateIds
        .map(id => modelMap.get(id))
        .filter((model): model is ModelConfig => Boolean(model))
        .filter(model => (isOffline ? model.provider === "mock" : model.provider !== "mock"))
        .slice(0, MAX_CONCURRENT_MODELS);

      if (modelsForRun.length === 0) {
        setLastRoutedAgents([]);
        finalizeWorkIfIdle();
        return;
      }

      setLastRoutedAgents(modelsForRun.map(model => model.label));

      for (const modelConfig of modelsForRun) {
        const cacheKey = crypto.SHA256(
          JSON.stringify({ model: modelConfig.id, prompt: normalizedPrompt }),
        ).toString();

        const cachedResponse = getCacheEntry(cacheKey);
        if (cachedResponse) {
          setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
          addMessage({ ...cachedResponse, chat_id: activeChatId });
          continue;
        }

        setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));

        const agentContext = contextWindow.filter(
          msg => msg.role === Role.User || msg.modelId === modelConfig.id,
        );

        if (modelConfig.provider === "mock") {
          pendingOfflineCount.current += 1;
          try {
            const aiResult = await getMockAiResponse(
              normalizedPrompt,
              currentUser,
              activeChat?.participants ?? [],
              agentContext,
              modelConfig.useRag === false ? [] : relevantFacts,
            );

            // Strip identity prefix if present in mock response
            const cleanResponse = aiResult.response.replace(/^\[.*?\]:\s*/, '').trim();

            const assistantMessage: Message = {
              id: crypto.lib.WordArray.random(16).toString(),
              chat_id: activeChatId,
              role: Role.Assistant,
              senderId: ASSISTANT_USER.id,
              senderName: `${ASSISTANT_USER.name} (${modelConfig.label})`,
              content: cleanResponse,
              modelId: modelConfig.id,
              modelLabel: modelConfig.label,
              created_at: new Date().toISOString(),
            };

            addMessage(assistantMessage);
            setCacheEntry(cacheKey, {
              ...assistantMessage,
              id: crypto.lib.WordArray.random(16).toString(),
            });

            // Auto-extract facts from the conversation
            if (learningEngineRef.current) {
              const extractedFacts = await learningEngineRef.current.extractFactsFromConversation(
                userMessage,
                assistantMessage,
                currentUser
              );
              extractedFacts.forEach(fact => learningEngineRef.current!.addFact(fact));
              if (extractedFacts.length > 0) {
                syncLearningEngine();
              }
            }

            if (aiResult.extractedFact) {
              await addFact(aiResult.extractedFact);
            }

            if (aiResult.toolCall) {
              const toolMessage: Message = {
                id: crypto.lib.WordArray.random(16).toString(),
                chat_id: activeChatId,
                role: Role.Tool,
                senderId: ASSISTANT_USER.id,
                senderName: `${ASSISTANT_USER.name} (${modelConfig.label})`,
                content: "Tool call proposed.",
                toolCall: aiResult.toolCall,
                modelId: modelConfig.id,
                modelLabel: modelConfig.label,
                created_at: new Date().toISOString(),
              };
              addMessage(toolMessage);
            }
          } finally {
            pendingOfflineCount.current = Math.max(0, pendingOfflineCount.current - 1);
            finalizeWorkIfIdle();
          }
        } else {
          startStream(
            modelConfig,
            trimmedContent,
            normalizedPrompt,
            activeChat,
            agentContext,
            relevantFacts,
            activeChatId,
            threadSummary,
            modelsForRun.map(model => model.label),
          );
        }
      }
      if (pendingStreamCount.current === 0 && pendingOfflineCount.current === 0) {
        setHasPendingWork(false);
      }

    },
    [
      activeChatId,
      addMessage,
      addFact,
      availableModels,
      chats,
      currentUser,
      finalizeWorkIfIdle,
      findRelevantFacts,
      getCacheEntry,
      isOffline,
      mergedModels,
      messages,
      selectedModels,
      setCacheEntry,
      startStream,
      syncLearningEngine,
    ],
  );

  const activeMessages = messages.filter(message => message.chat_id === activeChatId);
  const activeChat = chats.find(chat => chat.id === activeChatId) ?? null;

  // Get learning stats for UI
  const learningStats = learningEngineRef.current?.getStats();
  const clusterSummary = learningEngineRef.current?.getClusterSummary();

  // Handle sidebar navigation
  const handleSidebarNavigate = (section: SidebarSection) => {
    if (section === 'skills' || section === 'tools' || section === 'settings') {
      setSettingsSection(section === 'settings' ? 'prompts' : section);
      setSettingsPanelOpen(true);
    }
    // Other sections like 'chat', 'home', 'workspaces' could be handled here
  };

  return (
    <AppLayout
      onExecuteCommand={(command) => {
        // Handle slash commands from command palette
        if (command.startsWith('/')) {
          // Future: integrate with slashCommandsManager
          console.log('Command:', command);
        } else {
          // Send as regular message
          handleSendMessage(command);
        }
      }}
      onSidebarNavigate={handleSidebarNavigate}
      rightPanel={
        <SidePanel
          memoryFacts={memoryFacts}
          onDeleteFact={deleteFact}
          onAddFact={addFact}
          cacheStats={cacheStats}
          cacheSize={Object.keys(cache).length}
          learningStats={learningStats}
          clusterSummary={clusterSummary}
        />
      }
      showRightPanel={true}
    >
      {/* Main Chat Interface */}
      <EnhancedChatWindow
        messages={activeMessages}
        onSendMessage={handleSendMessage}
        isLoading={hasPendingWork}
        currentUser={currentUser.id}
      />

      {/* Model Manager Modal */}
      {isModelManagerOpen && (
        <ModelManagerModal
          models={sortModelsForDisplay(mergedModels)}
          onAdd={model => addModel(model)}
          onUpdate={(id, updates) => {
            const base = mergedModels.find(model => model.id === id);
            if (!base) {
              return;
            }
            updateModel(base, updates);
          }}
          onDelete={removeModel}
          onClose={() => setModelManagerOpen(false)}
        />
      )}

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
        initialSection={settingsSection}
      />
    </AppLayout>
  );
};

export default App;


