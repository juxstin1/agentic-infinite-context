import React, { createContext, useContext, useState, useEffect } from 'react';
import crypto from 'crypto-js';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  systemPrompt?: string;
  slashCommands?: Record<string, string>;
  skills?: string[];
  mcpServers?: string[];
  created_at: string;
  updated_at: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  createWorkspace: (data: Partial<Workspace>) => Workspace;
  updateWorkspace: (id: string, data: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  duplicateWorkspace: (id: string) => Workspace;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY = 'agentic-workspaces';
const ACTIVE_KEY = 'agentic-active-workspace';

const createDefaultWorkspace = (): Workspace => ({
  id: crypto.lib.WordArray.random(16).toString(),
  name: 'Personal',
  description: 'Your personal workspace',
  icon: '🏠',
  color: '#8b5cf6',
  systemPrompt: 'You are a helpful AI assistant.',
  slashCommands: {
    '/summarize': 'Summarize the conversation',
    '/search': 'Search through memory and facts',
  },
  skills: [],
  mcpServers: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.length > 0 ? parsed : [createDefaultWorkspace()];
      } catch {
        return [createDefaultWorkspace()];
      }
    }
    return [createDefaultWorkspace()];
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    const stored = localStorage.getItem(ACTIVE_KEY);
    return stored || workspaces[0]?.id;
  });

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  // Persist workspaces
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  }, [workspaces]);

  // Persist active workspace
  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeWorkspaceId);
  }, [activeWorkspaceId]);

  const createWorkspace = (data: Partial<Workspace>): Workspace => {
    const newWorkspace: Workspace = {
      id: crypto.lib.WordArray.random(16).toString(),
      name: data.name || 'New Workspace',
      description: data.description,
      icon: data.icon || '📁',
      color: data.color || '#8b5cf6',
      systemPrompt: data.systemPrompt || 'You are a helpful AI assistant.',
      slashCommands: data.slashCommands || {},
      skills: data.skills || [],
      mcpServers: data.mcpServers || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setWorkspaces(prev => [...prev, newWorkspace]);
    return newWorkspace;
  };

  const updateWorkspace = (id: string, data: Partial<Workspace>) => {
    setWorkspaces(prev =>
      prev.map(w =>
        w.id === id
          ? { ...w, ...data, updated_at: new Date().toISOString() }
          : w
      )
    );
  };

  const deleteWorkspace = (id: string) => {
    if (workspaces.length === 1) {
      // Don't delete the last workspace
      return;
    }

    setWorkspaces(prev => prev.filter(w => w.id !== id));

    // If deleting active workspace, switch to first one
    if (id === activeWorkspaceId) {
      const remaining = workspaces.filter(w => w.id !== id);
      setActiveWorkspaceId(remaining[0]?.id);
    }
  };

  const setActiveWorkspace = (id: string) => {
    const workspace = workspaces.find(w => w.id === id);
    if (workspace) {
      setActiveWorkspaceId(id);
    }
  };

  const duplicateWorkspace = (id: string): Workspace => {
    const original = workspaces.find(w => w.id === id);
    if (!original) throw new Error('Workspace not found');

    const duplicate: Workspace = {
      ...original,
      id: crypto.lib.WordArray.random(16).toString(),
      name: `${original.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setWorkspaces(prev => [...prev, duplicate]);
    return duplicate;
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        setActiveWorkspace,
        duplicateWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};

export default WorkspaceProvider;
