import { useState, useEffect, useCallback, useMemo } from "react";
import { Chat, Message, MemoryFact, CacheEntry, User } from "../types";
import { USERS } from "../constants";

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const STORAGE_KEYS = {
  CHATS: 'agentic-terminal-chats',
  MESSAGES: 'agentic-terminal-messages',
  MEMORY: 'agentic-terminal-memory',
  CACHE: 'agentic-terminal-cache'
};

export const useLocalDB = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [memoryFacts, setMemoryFacts] = useState<MemoryFact[]>([]);
  const [cache, setCache] = useState<Record<string, CacheEntry>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [embeddingStatus] = useState<"idle" | "loading" | "ready">("ready");
  const [dbStatus] = useState<"idle" | "loading" | "ready">("ready");

  // Load from localStorage on mount
  useEffect(() => {
    const loadPersistedData = () => {
      try {
        const savedChats = localStorage.getItem(STORAGE_KEYS.CHATS);
        if (savedChats) setChats(JSON.parse(savedChats));
        
        const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
        if (savedMessages) setMessages(JSON.parse(savedMessages));
        
        const savedMemory = localStorage.getItem(STORAGE_KEYS.MEMORY);
        if (savedMemory) setMemoryFacts(JSON.parse(savedMemory));
        
        const savedCache = localStorage.getItem(STORAGE_KEYS.CACHE);
        if (savedCache) setCache(JSON.parse(savedCache));
      } catch (error) {
        console.error('Failed to load persisted data:', error);
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEYS.CHATS);
        localStorage.removeItem(STORAGE_KEYS.MESSAGES);
        localStorage.removeItem(STORAGE_KEYS.MEMORY);
        localStorage.removeItem(STORAGE_KEYS.CACHE);
      }
    };
    
    loadPersistedData();
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(memoryFacts));
  }, [memoryFacts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
  }, [cache]);

  // Cache cleanup mechanism
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCache(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          const entry = updated[key];
          const age = (now - new Date(entry.created_at).getTime()) / 1000;
          if (age > entry.ttl_sec) {
            delete updated[key];
          }
        });
        return updated;
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const createChat = useCallback((title: string, participants: User[]) => {
    const newChat: Chat = {
      id: createId(),
      created_at: new Date().toISOString(),
      title,
      participants,
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    return newChat;
  }, []);

  useEffect(() => {
    if (chats.length === 0) {
      createChat("Main Chat", USERS);
    } else if (!activeChatId) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId, createChat]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const addFact = useCallback(async (fact: MemoryFact) => {
    setMemoryFacts(prev => {
      const existingIndex = prev.findIndex(item => item.id === fact.id);
      const nextFacts = [...prev];
      if (existingIndex >= 0) {
        nextFacts[existingIndex] = { ...nextFacts[existingIndex], ...fact, last_seen: new Date().toISOString() };
        return nextFacts;
      }
      return [
        ...nextFacts,
        {
          ...fact,
          first_seen: fact.first_seen ?? new Date().toISOString(),
          last_seen: fact.last_seen ?? new Date().toISOString(),
        },
      ];
    });
  }, []);

  const deleteFact = useCallback(async (factId: string) => {
    setMemoryFacts(prev => prev.filter(f => f.id !== factId));
  }, []);

  const getCacheEntry = useCallback((key: string): Message | null => {
    const entry = cache[key];
    if (!entry) return null;
    
    try {
      const parsed = JSON.parse(entry.response_json) as Message;
      // Validate parsed message structure
      if (!parsed.id || !parsed.content || !parsed.chat_id) {
        console.warn('Invalid cache entry structure:', parsed);
        setCache(prev => {
          const { [key]: removed, ...rest } = prev;
          return rest;
        });
        return null;
      }
      return parsed;
    } catch (error) {
      console.error('Cache entry parse error:', error);
      // Remove corrupted entry
      setCache(prev => {
        const { [key]: removed, ...rest } = prev;
        return rest;
      });
      return null;
    }
  }, [cache]);

  const setCacheEntry = useCallback((key: string, response: Message, ttlSec = 60 * 60 * 24 * 7) => {
    const entry: CacheEntry = {
      key_hash: key,
      response_json: JSON.stringify(response),
      created_at: new Date().toISOString(),
      ttl_sec: ttlSec,
    };
    setCache(prev => ({ ...prev, [key]: entry }));
  }, []);

  const findRelevantFacts = useCallback(async (prompt: string, limit = 5): Promise<MemoryFact[]> => {
    if (!prompt.trim()) return memoryFacts.slice(0, limit);
    
    const lowered = prompt.toLowerCase();
    const words = lowered.split(/\s+/).filter(word => word.length > 2);
    
    const scored = memoryFacts.map(fact => {
      const factLower = fact.fact.toLowerCase();
      let score = 0;
      
      // Exact match bonus
      if (factLower.includes(lowered)) score += 3;
      
      // Word-based scoring
      words.forEach(word => {
        if (factLower.includes(word)) score += 1;
      });
      
      // Recency bonus (more recent facts are more relevant)
      const daysAgo = (Date.now() - new Date(fact.last_seen).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 7 - daysAgo) * 0.1; // Bonus for recent facts
      
      return { fact, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.fact);

    return scored.length > 0 ? scored : memoryFacts.slice(0, limit);
  }, [memoryFacts]);

  // Memoize derived data for performance
  const activeChatMessages = useMemo(() =>
    messages.filter(message => message.chat_id === activeChatId),
    [messages, activeChatId]
  );

  const chatParticipants = useMemo(() =>
    chats.find(chat => chat.id === activeChatId)?.participants || [],
    [chats, activeChatId]
  );

  return {
    chats,
    messages,
    memoryFacts,
    cache,
    activeChatId,
    setActiveChatId,
    createChat,
    addMessage,
    addFact,
    deleteFact,
    getCacheEntry,
    setCacheEntry,
    findRelevantFacts,
    embeddingStatus,
    dbStatus,
    activeChatMessages,
    chatParticipants,
  };
};
