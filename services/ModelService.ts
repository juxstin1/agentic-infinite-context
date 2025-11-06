import { ModelConfig, ModelOrigin } from '../types';
import { createId } from '../utils/ids';

const STORAGE_KEY = 'agentic-models-v2';
const WORKSPACE_MODELS_KEY = 'agentic-workspace-models-v2';

/**
 * Built-in mock model for testing
 */
const MOCK_MODEL: ModelConfig = {
  id: 'mock',
  label: 'Mock Model (Local)',
  provider: 'mock',
  model: 'mock-1.0',
  endpoint: '',
  streamingProtocol: 'sse',
  isDefault: true,
  origin: 'mock',
};

/**
 * Default remote models
 */
const DEFAULT_REMOTE_MODELS: ModelConfig[] = [
  {
    id: 'gpt-4',
    label: 'GPT-4 (OpenAI)',
    provider: 'openai',
    model: 'gpt-4',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    streamingProtocol: 'sse',
    origin: 'remote-default',
  },
  {
    id: 'gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo (OpenAI)',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    streamingProtocol: 'sse',
    origin: 'remote-default',
  },
];

export interface WorkspaceModelConfig {
  workspaceId: string;
  defaultModelId?: string;
  enabledModels: string[]; // Model IDs enabled for this workspace
}

/**
 * ModelService manages AI models and their workspace associations
 * Consolidates useModelManager and adds workspace scoping
 */
export class ModelService {
  private customModels: ModelConfig[] = [];
  private workspaceConfigs: Map<string, WorkspaceModelConfig> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load models and workspace configs from localStorage
   */
  private loadFromStorage(): void {
    try {
      const savedModels = localStorage.getItem(STORAGE_KEY);
      if (savedModels) {
        this.customModels = JSON.parse(savedModels);
      }

      const savedWorkspaceConfigs = localStorage.getItem(WORKSPACE_MODELS_KEY);
      if (savedWorkspaceConfigs) {
        const configs = JSON.parse(savedWorkspaceConfigs) as WorkspaceModelConfig[];
        configs.forEach(config => {
          this.workspaceConfigs.set(config.workspaceId, config);
        });
      }
    } catch (error) {
      console.error('Failed to load model configs:', error);
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customModels));
    localStorage.setItem(
      WORKSPACE_MODELS_KEY,
      JSON.stringify(Array.from(this.workspaceConfigs.values()))
    );
  }

  /**
   * Get all built-in models
   */
  getBuiltinModels(): ModelConfig[] {
    return [MOCK_MODEL, ...DEFAULT_REMOTE_MODELS];
  }

  /**
   * Get all custom models
   */
  getCustomModels(): ModelConfig[] {
    return this.customModels;
  }

  /**
   * Get all models (builtin + custom)
   */
  getAllModels(): ModelConfig[] {
    return [...this.getBuiltinModels(), ...this.customModels];
  }

  /**
   * Get models for a specific workspace
   */
  getWorkspaceModels(workspaceId: string): ModelConfig[] {
    const config = this.workspaceConfigs.get(workspaceId);
    if (!config || config.enabledModels.length === 0) {
      // If no config, return all models
      return this.getAllModels();
    }

    // Return only enabled models
    const allModels = this.getAllModels();
    return allModels.filter(model => config.enabledModels.includes(model.id));
  }

  /**
   * Get default model for workspace
   */
  getDefaultModel(workspaceId?: string): ModelConfig {
    if (workspaceId) {
      const config = this.workspaceConfigs.get(workspaceId);
      if (config?.defaultModelId) {
        const model = this.getModelById(config.defaultModelId);
        if (model) return model;
      }
    }

    // Fall back to MOCK_MODEL
    return MOCK_MODEL;
  }

  /**
   * Get model by ID
   */
  getModelById(id: string): ModelConfig | undefined {
    return this.getAllModels().find(m => m.id === id);
  }

  /**
   * Add custom model
   */
  addCustomModel(model: Omit<ModelConfig, 'id' | 'origin'> & Partial<Pick<ModelConfig, 'id'>>): ModelConfig {
    const newModel: ModelConfig = {
      id: model.id || createId(),
      origin: 'custom',
      hasCustomConfig: true,
      ...model,
    };

    this.customModels.push(newModel);
    this.saveToStorage();
    return newModel;
  }

  /**
   * Update custom model
   */
  updateCustomModel(id: string, updates: Partial<ModelConfig>): void {
    const index = this.customModels.findIndex(m => m.id === id);
    if (index >= 0) {
      this.customModels[index] = { ...this.customModels[index], ...updates };
      this.saveToStorage();
    }
  }

  /**
   * Remove custom model
   */
  removeCustomModel(id: string): void {
    this.customModels = this.customModels.filter(m => m.id !== id);
    this.saveToStorage();
  }

  /**
   * Discover models from LM Studio
   */
  async discoverLMStudioModels(): Promise<ModelConfig[]> {
    try {
      const response = await fetch('http://localhost:1234/v1/models');
      if (!response.ok) {
        throw new Error('LM Studio not available');
      }

      const data = await response.json();
      const models: ModelConfig[] = data.data?.map((model: any) => ({
        id: `lmstudio-${model.id}`,
        label: `${model.id} (LM Studio)`,
        provider: 'lmstudio',
        model: model.id,
        endpoint: 'http://localhost:1234/v1/chat/completions',
        streamingProtocol: 'sse',
        origin: 'lmstudio' as ModelOrigin,
      })) || [];

      return models;
    } catch (error) {
      console.error('Failed to discover LM Studio models:', error);
      return [];
    }
  }

  /**
   * Set workspace model configuration
   */
  setWorkspaceConfig(config: WorkspaceModelConfig): void {
    this.workspaceConfigs.set(config.workspaceId, config);
    this.saveToStorage();
  }

  /**
   * Get workspace model configuration
   */
  getWorkspaceConfig(workspaceId: string): WorkspaceModelConfig | undefined {
    return this.workspaceConfigs.get(workspaceId);
  }

  /**
   * Enable models for workspace
   */
  enableModelsForWorkspace(workspaceId: string, modelIds: string[]): void {
    const config = this.workspaceConfigs.get(workspaceId) || {
      workspaceId,
      enabledModels: [],
    };

    config.enabledModels = modelIds;
    this.setWorkspaceConfig(config);
  }

  /**
   * Set default model for workspace
   */
  setDefaultModelForWorkspace(workspaceId: string, modelId: string): void {
    const config = this.workspaceConfigs.get(workspaceId) || {
      workspaceId,
      enabledModels: [],
    };

    config.defaultModelId = modelId;
    this.setWorkspaceConfig(config);
  }

  /**
   * Get model statistics
   */
  getStats() {
    const allModels = this.getAllModels();
    return {
      total: allModels.length,
      custom: this.customModels.length,
      builtin: this.getBuiltinModels().length,
      byProvider: allModels.reduce((acc, model) => {
        acc[model.provider] = (acc[model.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      workspaces: this.workspaceConfigs.size,
    };
  }
}

// Singleton instance
export const modelService = new ModelService();
