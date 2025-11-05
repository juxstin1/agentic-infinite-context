import React, { useMemo, useState } from "react";
import { ModelConfig } from "../types";
import { MAX_CONCURRENT_MODELS, PROVIDER_DEFAULT_ENDPOINT } from "../constants";

interface ModelManagerModalProps {
  models: ModelConfig[];
  onAdd: (model: ModelConfig) => void;
  onUpdate: (id: string, updates: Partial<ModelConfig>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const emptyForm: ModelConfig = {
  id: "",
  label: "",
  provider: "openai",
  model: "",
  endpoint: PROVIDER_DEFAULT_ENDPOINT.openai,
  streamingProtocol: "sse",
  useRag: true,
};

const providerOptions: Array<{ value: ModelConfig["provider"]; label: string }> = [
  { value: "openai", label: "OpenAI-compatible (remote)" },
  { value: "lmstudio", label: "LM Studio override" },
  { value: "mock", label: "Mock" },
];

const ModelManagerModal: React.FC<ModelManagerModalProps> = ({ models, onAdd, onUpdate, onDelete, onClose }) => {
  const [formState, setFormState] = useState<ModelConfig>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState<Partial<ModelConfig>>({});
  const [error, setError] = useState<string | null>(null);

  const sortedModels = useMemo(() => {
    const priority = (model: ModelConfig) => {
      switch (model.origin) {
        case "lmstudio":
          return 0;
        case "remote-default":
          return 1;
        case "custom":
          return 2;
        case "mock":
        default:
          return -1;
      }
    };
    return [...models].sort((a, b) => priority(a) - priority(b) || a.label.localeCompare(b.label));
  }, [models]);

  const handleAdd = () => {
    if (!formState.label.trim()) {
      setError("Label is required");
      return;
    }
    if (!formState.model?.trim()) {
      setError("Model ID is required");
      return;
    }
    const model: ModelConfig = {
      ...formState,
      id: formState.id.trim() || formState.model.trim(),
      label: formState.label.trim(),
      model: formState.model.trim(),
      provider: formState.provider,
      endpoint:
        formState.provider === "mock"
          ? ""
          : formState.endpoint?.trim() || PROVIDER_DEFAULT_ENDPOINT[formState.provider],
      apiKey: formState.apiKey?.trim() || undefined,
      useRag: formState.useRag ?? true,
      streamingProtocol: formState.streamingProtocol || "sse",
      origin: "custom",
    };
    onAdd(model);
    setFormState({
      ...emptyForm,
      provider: model.provider,
      endpoint: model.provider === "mock" ? "" : PROVIDER_DEFAULT_ENDPOINT[model.provider],
    });
    setError(null);
  };

  const openEdit = (model: ModelConfig) => {
    setEditingId(model.id);
    setEditingState(model);
    setError(null);
  };

  const handleUpdate = () => {
    if (!editingId) {
      return;
    }
    if (!editingState.label?.trim()) {
      setError("Label is required");
      return;
    }
    if (editingState.provider !== "mock" && !editingState.endpoint?.trim()) {
      setError("Endpoint is required for this provider");
      return;
    }
    onUpdate(editingId, {
      ...editingState,
      label: editingState.label.trim(),
      model: editingState.model?.trim(),
      endpoint:
        editingState.provider === "mock"
          ? ""
          : editingState.endpoint?.trim() || PROVIDER_DEFAULT_ENDPOINT[editingState.provider ?? "openai"],
      apiKey: editingState.apiKey?.trim() || undefined,
    });
    setEditingId(null);
    setEditingState({});
    setError(null);
  };

  const handleDelete = (model: ModelConfig) => {
    onDelete(model.id);
    if (editingId === model.id) {
      setEditingId(null);
      setEditingState({});
    }
  };

  const isEditing = (id: string) => editingId === id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
      <div className="w-[720px] max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Model Manager</h2>
            <p className="text-xs text-slate-400">Select up to {MAX_CONCURRENT_MODELS} models to stream concurrently.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {error && <div className="rounded bg-red-500/10 text-red-300 text-xs px-3 py-2">{error}</div>}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Configured Models</h3>
            {sortedModels.length === 0 ? (
              <p className="text-sm text-slate-500">No models available.</p>
            ) : (
              <div className="space-y-3">
                {sortedModels.map(model => {
                  const editable = model.provider !== "mock";
                  const canDelete = model.origin === "custom";
                  const canReset = !canDelete && model.hasCustomConfig;

                  return (
                    <div key={model.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{model.label}</p>
                          <p className="text-[11px] text-slate-500">
                            {model.provider.toUpperCase()} • {model.model || model.id}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {editable && (
                            <button
                              type="button"
                              onClick={() => (isEditing(model.id) ? setEditingId(null) : openEdit(model))}
                              className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-200 hover:border-purple-400"
                            >
                              {isEditing(model.id) ? "Cancel" : "Edit"}
                            </button>
                          )}
                          {(canDelete || canReset) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(model)}
                              className={`text-xs px-2 py-1 rounded border ${
                                canDelete
                                  ? "border-red-700 text-red-300 hover:text-red-200"
                                  : "border-slate-700 text-slate-300 hover:text-slate-200"
                              }`}
                            >
                              {canDelete ? "Delete" : "Reset"}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 text-xs text-slate-300">
                        {isEditing(model.id) && editable ? (
                          <>
                            <div className="grid gap-1">
                              <label className="text-[10px] uppercase text-slate-500">Label</label>
                              <input
                                type="text"
                                value={editingState.label ?? model.label}
                                onChange={event => setEditingState(state => ({ ...state, label: event.target.value }))}
                                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                              />
                            </div>
                            <div className="grid gap-1">
                              <label className="text-[10px] uppercase text-slate-500">Provider</label>
                              <select
                                value={editingState.provider ?? model.provider}
                                onChange={event => {
                                  const provider = event.target.value as ModelConfig["provider"];
                                  setEditingState(state => ({
                                    ...state,
                                    provider,
                                    endpoint:
                                      provider === "mock"
                                        ? ""
                                        : state?.endpoint || PROVIDER_DEFAULT_ENDPOINT[provider],
                                  }));
                                }}
                                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                              >
                                {providerOptions.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid gap-1">
                              <label className="text-[10px] uppercase text-slate-500">Model ID</label>
                              <input
                                type="text"
                                value={editingState.model ?? model.model ?? model.id}
                                onChange={event => setEditingState(state => ({ ...state, model: event.target.value }))}
                                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                              />
                            </div>
                            {(editingState.provider ?? model.provider) !== "mock" && (
                              <>
                                <div className="grid gap-1">
                                  <label className="text-[10px] uppercase text-slate-500">Endpoint</label>
                                  <input
                                    type="text"
                                    value={editingState.endpoint ?? model.endpoint ?? ""}
                                    onChange={event => setEditingState(state => ({ ...state, endpoint: event.target.value }))}
                                    className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <label className="text-[10px] uppercase text-slate-500">API Key</label>
                                  <input
                                    type="password"
                                    value={editingState.apiKey ?? model.apiKey ?? ""}
                                    onChange={event => setEditingState(state => ({ ...state, apiKey: event.target.value }))}
                                    className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                                  />
                                </div>
                              </>
                            )}
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-[11px] text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={editingState.useRag ?? model.useRag ?? true}
                                  onChange={event => setEditingState(state => ({ ...state, useRag: event.target.checked }))}
                                  className="accent-purple-500"
                                />
                                Use RAG context
                              </label>
                              <button
                                type="button"
                                onClick={handleUpdate}
                                className="px-3 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-500"
                              >
                                Save changes
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            {(model.endpoint || model.apiKey) && (
                              <div className="text-[11px] text-slate-400">
                                {model.endpoint && <div>Endpoint: {model.endpoint}</div>}
                                {model.apiKey && <div>API Key: ??????</div>}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400">
                              Streaming: {model.streamingProtocol ?? "sse"} • RAG: {model.useRag ? "on" : "off"}
                            </div>
                            {model.hasCustomConfig && model.origin !== "custom" && (
                              <div className="text-[10px] text-purple-300/80">Custom override applied</div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Add Model</h3>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-[10px] uppercase text-slate-500">Label</label>
                <input
                  type="text"
                  value={formState.label}
                  onChange={event => setFormState(state => ({ ...state, label: event.target.value }))}
                  className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-[10px] uppercase text-slate-500">Provider</label>
                <select
                  value={formState.provider}
                  onChange={event => {
                    const provider = event.target.value as ModelConfig["provider"];
                    setFormState(state => ({
                      ...state,
                      provider,
                      endpoint: provider === "mock" ? "" : PROVIDER_DEFAULT_ENDPOINT[provider],
                    }));
                  }}
                  className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  {providerOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-[10px] uppercase text-slate-500">Model ID</label>
                <input
                  type="text"
                  value={formState.model ?? ""}
                  onChange={event => setFormState(state => ({ ...state, model: event.target.value }))}
                  className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              {formState.provider !== "mock" && (
                <>
                  <div className="grid gap-1">
                    <label className="text-[10px] uppercase text-slate-500">Endpoint</label>
                    <input
                      type="text"
                      value={formState.endpoint ?? ""}
                      onChange={event => setFormState(state => ({ ...state, endpoint: event.target.value }))}
                      className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[10px] uppercase text-slate-500">API Key</label>
                    <input
                      type="password"
                      value={formState.apiKey ?? ""}
                      onChange={event => setFormState(state => ({ ...state, apiKey: event.target.value }))}
                      className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={formState.useRag ?? true}
                    onChange={event => setFormState(state => ({ ...state, useRag: event.target.checked }))}
                    className="accent-purple-500"
                  />
                  Use RAG context when available
                </label>
                <button
                  type="button"
                  onClick={handleAdd}
                  className="px-3 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-500"
                >
                  Add model
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ModelManagerModal;
