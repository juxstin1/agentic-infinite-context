import { useState, useEffect, useCallback, useMemo } from "react";
import { MemoryFact, CacheEntry, ToolMemory, MessageFeedback } from "../types";
import { createId } from "../utils/ids";

const STORAGE_KEYS = {
  MEMORY: 'agentic-memory-v2',
  CACHE: 'agentic-cache-v2',
  TOOL_MEMORIES: 'agentic-tool-memories-v2',
  FEEDBACKS: 'agentic-feedbacks-v2',
};

interface MemoryFactWithWorkspace extends MemoryFact {
  workspaceId?: string;
}

interface ToolMemoryWithWorkspace extends ToolMemory {
  workspaceId?: string;
}

interface MessageFeedbackWithWorkspace extends MessageFeedback {
  workspaceId?: string;
}

export const useLocalDB = (workspaceId?: string) => {
  // All memory facts (unfiltered)
  const [allMemoryFacts, setAllMemoryFacts] = useState<MemoryFactWithWorkspace[]>([]);
  const [cache, setCache] = useState<Record<string, CacheEntry>>({});
  const [allToolMemories, setAllToolMemories] = useState<ToolMemoryWithWorkspace[]>([]);
  const [allFeedbacks, setAllFeedbacks] = useState<MessageFeedbackWithWorkspace[]>([]);

  const [embeddingStatus] = useState<"idle" | "loading" | "ready">("ready");
  const [dbStatus] = useState<"idle" | "loading" | "ready">("ready");

  // Filter by workspace
  const memoryFacts = useMemo(() =>
    workspaceId ? allMemoryFacts.filter(f => f.workspaceId === workspaceId) : allMemoryFacts,
    [allMemoryFacts, workspaceId]
  );

  const toolMemories = useMemo(() =>
    workspaceId ? allToolMemories.filter(m => m.workspaceId === workspaceId) : allToolMemories,
    [allToolMemories, workspaceId]
  );

  const feedbacks = useMemo(() =>
    workspaceId ? allFeedbacks.filter(f => f.workspaceId === workspaceId) : allFeedbacks,
    [allFeedbacks, workspaceId]
  );

  // Load from localStorage on mount
  useEffect(() => {
    const loadPersistedData = () => {
      try {
        const savedMemory = localStorage.getItem(STORAGE_KEYS.MEMORY);
        if (savedMemory) setAllMemoryFacts(JSON.parse(savedMemory));

        const savedCache = localStorage.getItem(STORAGE_KEYS.CACHE);
        if (savedCache) setCache(JSON.parse(savedCache));

        const savedToolMemories = localStorage.getItem(STORAGE_KEYS.TOOL_MEMORIES);
        if (savedToolMemories) setAllToolMemories(JSON.parse(savedToolMemories));

        const savedFeedbacks = localStorage.getItem(STORAGE_KEYS.FEEDBACKS);
        if (savedFeedbacks) setAllFeedbacks(JSON.parse(savedFeedbacks));
      } catch (error) {
        console.error('Failed to load persisted data:', error);
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEYS.MEMORY);
        localStorage.removeItem(STORAGE_KEYS.CACHE);
        localStorage.removeItem(STORAGE_KEYS.TOOL_MEMORIES);
        localStorage.removeItem(STORAGE_KEYS.FEEDBACKS);
      }
    };

    loadPersistedData();
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(allMemoryFacts));
  }, [allMemoryFacts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
  }, [cache]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOOL_MEMORIES, JSON.stringify(allToolMemories));
  }, [allToolMemories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FEEDBACKS, JSON.stringify(allFeedbacks));
  }, [allFeedbacks]);

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

  const addFact = useCallback(async (fact: Omit<MemoryFactWithWorkspace, 'id' | 'first_seen' | 'last_seen'> & Partial<Pick<MemoryFactWithWorkspace, 'id' | 'first_seen' | 'last_seen'>>) => {
    const now = new Date().toISOString();
    const factWithWorkspace: MemoryFactWithWorkspace = {
      id: fact.id || createId(),
      workspaceId: workspaceId,
      first_seen: fact.first_seen || now,
      last_seen: fact.last_seen || now,
      ...fact,
    };

    setAllMemoryFacts(prev => {
      const existingIndex = prev.findIndex(item => item.id === factWithWorkspace.id);
      const nextFacts = [...prev];
      if (existingIndex >= 0) {
        nextFacts[existingIndex] = {
          ...nextFacts[existingIndex],
          ...factWithWorkspace,
          last_seen: now
        };
        return nextFacts;
      }
      return [...nextFacts, factWithWorkspace];
    });
  }, [workspaceId]);

  const deleteFact = useCallback(async (factId: string) => {
    setAllMemoryFacts(prev => prev.filter(f => f.id !== factId));
  }, []);

  const updateFact = useCallback((factId: string, updates: Partial<MemoryFactWithWorkspace>) => {
    setAllMemoryFacts(prev => {
      const index = prev.findIndex(f => f.id === factId);
      if (index === -1) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  }, []);

  const addToolMemory = useCallback((memory: Omit<ToolMemoryWithWorkspace, 'id' | 'created_at'> & Partial<Pick<ToolMemoryWithWorkspace, 'id' | 'created_at'>>) => {
    const memoryWithWorkspace: ToolMemoryWithWorkspace = {
      id: memory.id || createId(),
      created_at: memory.created_at || new Date().toISOString(),
      workspaceId: workspaceId,
      ...memory,
    };

    setAllToolMemories(prev => {
      const index = prev.findIndex(m =>
        m.tool_name === memoryWithWorkspace.tool_name &&
        m.workspaceId === memoryWithWorkspace.workspaceId
      );
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = memoryWithWorkspace;
        return updated;
      }
      return [...prev, memoryWithWorkspace];
    });
  }, [workspaceId]);

  const addFeedback = useCallback((feedback: Omit<MessageFeedbackWithWorkspace, 'created_at'> & Partial<Pick<MessageFeedbackWithWorkspace, 'created_at'>>) => {
    const feedbackWithWorkspace: MessageFeedbackWithWorkspace = {
      created_at: feedback.created_at || new Date().toISOString(),
      workspaceId: workspaceId,
      ...feedback,
    };

    setAllFeedbacks(prev => {
      const index = prev.findIndex(f =>
        f.message_id === feedbackWithWorkspace.message_id &&
        f.workspaceId === feedbackWithWorkspace.workspaceId
      );
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = feedbackWithWorkspace;
        return updated;
      }
      return [...prev, feedbackWithWorkspace];
    });
  }, [workspaceId]);

  const getCacheEntry = useCallback((key: string): any | null => {
    const entry = cache[key];
    if (!entry) return null;

    try {
      const parsed = JSON.parse(entry.response_json);
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

  const setCacheEntry = useCallback((key: string, response: any, ttlSec = 60 * 60 * 24 * 7) => {
    const entry: CacheEntry = {
      key_hash: key,
      response_json: JSON.stringify(response),
      created_at: new Date().toISOString(),
      ttl_sec: ttlSec,
    };
    setCache(prev => ({ ...prev, [key]: entry }));
  }, []);

  const findRelevantFacts = useCallback(async (prompt: string, limit = 5): Promise<MemoryFactWithWorkspace[]> => {
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

      // Confidence boost (if available)
      if (fact.confidence) {
        score += fact.confidence * 0.5;
      }

      return { fact, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.fact);

    return scored.length > 0 ? scored : memoryFacts.slice(0, limit);
  }, [memoryFacts]);

  // Memoize cache stats
  const cacheStats = useMemo(() => {
    const entries = Object.keys(cache).length;
    return {
      entries,
      hits: 0, // Would need tracking logic
      misses: 0, // Would need tracking logic
    };
  }, [cache]);

  return {
    // Workspace-scoped data
    memoryFacts,
    toolMemories,
    feedbacks,

    // Global data
    cache,

    // Methods
    addFact,
    deleteFact,
    updateFact,
    addToolMemory,
    addFeedback,
    getCacheEntry,
    setCacheEntry,
    findRelevantFacts,

    // Status
    embeddingStatus,
    dbStatus,
    cacheStats,

    // Setters (for compatibility)
    setMemoryFacts: setAllMemoryFacts,
    setToolMemories: setAllToolMemories,
  };
};
