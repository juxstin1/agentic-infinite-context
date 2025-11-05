import React from "react";
import { Chat, Model, ModelConfig } from "../types";
import { MAX_CONCURRENT_MODELS } from "../constants";

interface HeaderProps {
  chat: Chat | null;
  isOffline: boolean;
  setIsOffline: (isOffline: boolean) => void;
  embeddingStatus: "idle" | "loading" | "ready";
  dbStatus: "idle" | "loading" | "ready";
  lmStudioStatus: "offline" | "online" | "error";
  modelOptions: ModelConfig[];
  selectedModels: Model[];
  onSelectModels: (models: Model[]) => void;
  onOpenModelManager: () => void;
}

const statusColor = (status: string) => {
  switch (status) {
    case "ready":
    case "online":
      return "text-green-400";
    case "loading":
      return "text-amber-400";
    case "error":
      return "text-red-500";
    default:
      return "text-slate-400";
  }
};

const describeModel = (model: ModelConfig) => {
  if (model.provider === "mock") {
    return "Mock";
  }
  if (model.origin === "lmstudio") {
    return "LM Studio";
  }
  if (model.origin === "remote-default") {
    return "Remote default";
  }
  if (model.origin === "custom") {
    return "Custom";
  }
  return model.provider.toUpperCase();
};

const Header: React.FC<HeaderProps> = ({
  chat,
  isOffline,
  setIsOffline,
  embeddingStatus,
  dbStatus,
  lmStudioStatus,
  modelOptions,
  selectedModels,
  onSelectModels,
  onOpenModelManager,
}) => {
  const isAtCapacity = selectedModels.length >= MAX_CONCURRENT_MODELS;

  const toggleModel = (modelId: Model) => {
    if (selectedModels.includes(modelId)) {
      onSelectModels(selectedModels.filter(id => id !== modelId));
      return;
    }
    if (isAtCapacity) {
      return;
    }
    onSelectModels([...selectedModels, modelId]);
  };

  return (
    <header className="flex items-center justify-between p-4 bg-slate-800/80 border-b border-slate-700/40">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-slate-400">Active Chat</span>
        {chat ? (
          <span className="text-lg font-semibold text-slate-100">{chat.title}</span>
        ) : (
          <span className="text-lg font-semibold text-slate-500">No chat selected</span>
        )}
        {chat && (
          <span className="text-xs text-slate-400">{chat.participants.length} participants</span>
        )}
      </div>

      <div className="flex flex-col gap-3 items-end">
        <div className="flex gap-4 text-xs text-slate-300">
          <span className={statusColor(embeddingStatus)}>Embeddings: {embeddingStatus}</span>
          <span className={statusColor(dbStatus)}>Vector DB: {dbStatus}</span>
          <span className={statusColor(lmStudioStatus)}>LM Studio: {lmStudioStatus}</span>
        </div>

        <div className="flex flex-wrap gap-2 justify-end items-center">
          <button
            type="button"
            onClick={onOpenModelManager}
            className="px-2 py-1 text-xs rounded border border-slate-600 text-slate-200 hover:border-purple-400 hover:text-white transition-colors"
          >
            Manage models
          </button>
          {modelOptions.length === 0 && (
            <span className="text-xs text-slate-500">No models detected</span>
          )}
          {modelOptions.map(option => {
            const active = selectedModels.includes(option.id);
            const disabled = !active && isAtCapacity;
            const originLabel = describeModel(option);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleModel(option.id)}
                disabled={disabled}
                className={`px-3 py-1 text-xs rounded-full border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:ring-offset-1 focus:ring-offset-slate-900 ${
                  active
                    ? "bg-purple-600 text-white border-purple-400"
                    : disabled
                      ? "bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed"
                      : "bg-slate-800/70 text-slate-200 border-slate-600 hover:border-slate-400"
                }`}
                title={`${originLabel}${option.endpoint ? ` • ${option.endpoint}` : ""}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-200">
          <span>{isOffline ? "Offline-only" : "Online"}</span>
          <button
            type="button"
            onClick={() => setIsOffline(!isOffline)}
            className={`w-14 h-6 flex items-center rounded-full px-1 transition-colors duration-300 ${
              isOffline ? "bg-slate-700" : "bg-purple-600"
            }`}
          >
            <span
              className={`w-4 h-4 bg-white rounded-full transform transition-transform duration-300 ${
                isOffline ? "translate-x-0" : "translate-x-8"
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
