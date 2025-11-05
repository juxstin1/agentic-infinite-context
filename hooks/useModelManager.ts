import { useCallback, useEffect, useMemo, useState } from "react";
import { ModelConfig } from "../types";
import { DEFAULT_REMOTE_MODELS, MOCK_MODEL, PROVIDER_DEFAULT_ENDPOINT } from "../constants";

const STORAGE_KEY = "model_manager.custom_models.v1";

const sanitizeModel = (model: ModelConfig): ModelConfig => {
  const id = model.id.trim();
  const label = model.label?.trim() || id;
  const provider = model.provider;
  const endpoint =
    provider === "mock"
      ? ""
      : model.endpoint?.trim() || PROVIDER_DEFAULT_ENDPOINT[provider] || "";

  const sanitized: ModelConfig = {
    ...model,
    id,
    label,
    provider,
    model: model.model?.trim() || id,
    endpoint,
    apiKey: model.apiKey?.trim() || undefined,
    headers: model.headers && Object.keys(model.headers).length > 0 ? model.headers : undefined,
    streamingProtocol: model.streamingProtocol || "sse",
    useRag: model.useRag ?? true,
    origin:
      model.origin ||
      (provider === "mock"
        ? "mock"
        : provider === "lmstudio"
          ? "lmstudio"
          : "custom"),
    isDefault: false,
  };

  return sanitized;
};

const normalizeBaseModel = (model: ModelConfig): ModelConfig => {
  const base = sanitizeModel(model);
  return {
    ...base,
    origin: model.origin || base.origin,
    isDefault: model.isDefault ?? base.isDefault,
    hasCustomConfig: false,
  };
};

const loadCustomModels = (): ModelConfig[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(item => sanitizeModel(item as ModelConfig));
  } catch (error) {
    console.error("Failed to load model overrides", error);
    return [];
  }
};

export const useModelManager = () => {
  const [customModels, setCustomModels] = useState<ModelConfig[]>(loadCustomModels);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customModels));
  }, [customModels]);

  const addModel = useCallback((model: ModelConfig) => {
    setCustomModels(prev => {
      const sanitized = sanitizeModel({ ...model, origin: model.origin || "custom" });
      const filtered = prev.filter(item => item.id !== sanitized.id);
      return [...filtered, sanitized];
    });
  }, []);

  const updateModel = useCallback((baseModel: ModelConfig, updates: Partial<ModelConfig>) => {
    setCustomModels(prev => {
      const merged: ModelConfig = {
        ...baseModel,
        ...updates,
        id: baseModel.id,
        provider: baseModel.provider,
        origin: baseModel.origin || (baseModel.provider === "lmstudio" ? "lmstudio" : "custom"),
      };
      const sanitized = sanitizeModel(merged);
      const filtered = prev.filter(item => item.id !== sanitized.id);
      return [...filtered, sanitized];
    });
  }, []);

  const removeModel = useCallback((id: string) => {
    setCustomModels(prev => prev.filter(model => model.id !== id));
  }, []);

  const mergeWithBase = useCallback(
    (baseModels: ModelConfig[]) => {
      const map = new Map<string, ModelConfig>();
      baseModels.forEach(model => {
        const normalized = normalizeBaseModel(model);
        map.set(normalized.id, normalized);
      });

      customModels.forEach(model => {
        const existing = map.get(model.id);
        if (existing) {
          map.set(model.id, {
            ...existing,
            ...model,
            id: existing.id,
            provider: existing.provider,
            origin: existing.origin,
            isDefault: existing.isDefault,
            hasCustomConfig: true,
          });
        } else {
          map.set(model.id, {
            ...sanitizeModel(model),
            hasCustomConfig: true,
          });
        }
      });

      return Array.from(map.values());
    },
    [customModels],
  );

  const builtinModels = useMemo(() => [MOCK_MODEL, ...DEFAULT_REMOTE_MODELS], []);

  return {
    customModels,
    builtinModels,
    addModel,
    updateModel,
    removeModel,
    mergeWithBase,
  };
};
