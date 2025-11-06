import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Chat, Message, User } from '../types';
import { createId } from '../utils/ids';
import { useWorkspace } from './WorkspaceContext';

interface ChatContextType {
  // Chat management
  chats: Chat[];
  activeChat: Chat | null;
  setActiveChat: (chatId: string | null) => void;
  createChat: (name?: string) => Chat;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, newName: string) => void;

  // Message management
  messages: Message[];
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'created_at' | 'chat_id'>) => Message;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;

  // Streaming state
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CHATS: 'agentic-chats-v2',
  MESSAGES: 'agentic-messages-v2',
  ACTIVE_CHAT: 'agentic-active-chat-v2',
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeWorkspace } = useWorkspace();

  // Load chats from localStorage
  const [allChats, setAllChats] = useState<Chat[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CHATS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Load messages from localStorage
  const [allMessages, setAllMessages] = useState<Message[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Active chat ID
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT);
    return stored || null;
  });

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);

  // Filter chats by active workspace
  const chats = allChats.filter(chat => chat.workspaceId === activeWorkspace?.id);

  // Get active chat
  const activeChat = chats.find(chat => chat.id === activeChatId) || null;

  // Get messages for active chat
  const messages = activeChat
    ? allMessages.filter(msg => msg.chat_id === activeChat.id || msg.chatId === activeChat.id)
    : [];

  // Persist chats
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(allChats));
  }, [allChats]);

  // Persist messages
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(allMessages));
  }, [allMessages]);

  // Persist active chat
  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT, activeChatId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT);
    }
  }, [activeChatId]);

  // When workspace changes, create default chat if none exist
  useEffect(() => {
    if (activeWorkspace && chats.length === 0) {
      const newChat = createChat('New Chat');
      setActiveChatId(newChat.id);
    } else if (activeWorkspace && chats.length > 0 && !activeChat) {
      // Set first chat as active if no active chat
      setActiveChatId(chats[0].id);
    }
  }, [activeWorkspace?.id]);

  const createChat = useCallback((name?: string): Chat => {
    if (!activeWorkspace) {
      throw new Error('No active workspace');
    }

    const newChat: Chat = {
      id: createId(),
      title: name || `Chat ${allChats.length + 1}`,
      name: name || `Chat ${allChats.length + 1}`,
      workspaceId: activeWorkspace.id,
      participants: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setAllChats(prev => [...prev, newChat]);
    return newChat;
  }, [activeWorkspace, allChats.length]);

  const deleteChat = useCallback((chatId: string) => {
    setAllChats(prev => prev.filter(c => c.id !== chatId));
    setAllMessages(prev => prev.filter(m => m.chat_id !== chatId && m.chatId !== chatId));

    if (activeChatId === chatId) {
      const remainingChats = chats.filter(c => c.id !== chatId);
      setActiveChatId(remainingChats[0]?.id || null);
    }
  }, [activeChatId, chats]);

  const renameChat = useCallback((chatId: string, newName: string) => {
    setAllChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? { ...chat, title: newName, name: newName, updated_at: new Date().toISOString() }
          : chat
      )
    );
  }, []);

  const setActiveChat = useCallback((chatId: string | null) => {
    setActiveChatId(chatId);
  }, []);

  const addMessage = useCallback((chatId: string, message: Omit<Message, 'id' | 'created_at' | 'chat_id'>): Message => {
    const now = new Date().toISOString();
    const newMessage: Message = {
      ...message,
      id: createId(),
      chat_id: chatId,
      chatId: chatId,
      created_at: now,
      timestamp: now,
    };

    setAllMessages(prev => [...prev, newMessage]);

    // Update chat's updated_at
    setAllChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? { ...chat, updated_at: now }
          : chat
      )
    );

    return newMessage;
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setAllMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    setAllMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        setActiveChat,
        createChat,
        deleteChat,
        renameChat,
        messages,
        addMessage,
        updateMessage,
        deleteMessage,
        isStreaming,
        setIsStreaming,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export default ChatProvider;
