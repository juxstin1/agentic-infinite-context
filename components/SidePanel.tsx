import React, { useState } from "react";
import { MemoryFact } from "../types";

interface SidePanelProps {
  memoryFacts: MemoryFact[];
  onDeleteFact: (factId: string) => void;
  onAddFact: (fact: MemoryFact) => Promise<void> | void;
  cacheStats: { hits: number; misses: number };
  cacheSize: number;
}

type PanelTab = "memory" | "cache";

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const SidePanel: React.FC<SidePanelProps> = ({ memoryFacts, onDeleteFact, onAddFact, cacheStats, cacheSize }) => {
  const [tab, setTab] = useState<PanelTab>("memory");
  const [factText, setFactText] = useState("");
  const [factKind, setFactKind] = useState<MemoryFact["kind"]>("profile");

  const handleAdd = async () => {
    const trimmed = factText.trim();
    if (!trimmed) return;
    const timestamp = new Date().toISOString();
    await onAddFact({
      id: createId(),
      fact: trimmed,
      kind: factKind,
      first_seen: timestamp,
      last_seen: timestamp,
    });
    setFactText("");
  };

  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total === 0 ? 0 : Math.round((cacheStats.hits / total) * 100);

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800/70 flex flex-col">
      <div className="flex">
        <button
          type="button"
          onClick={() => setTab("memory")}
          className={`flex-1 px-3 py-2 text-sm font-medium border-b ${
            tab === "memory" ? "border-purple-500 text-purple-200" : "border-transparent text-slate-400"
          }`}
        >
          Memory
        </button>
        <button
          type="button"
          onClick={() => setTab("cache")}
          className={`flex-1 px-3 py-2 text-sm font-medium border-b ${
            tab === "cache" ? "border-purple-500 text-purple-200" : "border-transparent text-slate-400"
          }`}
        >
          Cache
        </button>
      </div>

      {tab === "memory" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase text-slate-400">Add Fact</label>
            <textarea
              value={factText}
              onChange={event => setFactText(event.target.value)}
              rows={3}
              placeholder="Something worth remembering..."
              className="w-full rounded border border-slate-700 bg-slate-900 text-slate-100 text-sm p-2 resize-none"
            />
            <div className="flex items-center justify-between">
              <select
                value={factKind}
                onChange={event => setFactKind(event.target.value as MemoryFact["kind"])}
                className="bg-slate-900 border border-slate-700 text-sm text-slate-200 rounded px-2 py-1"
              >
                <option value="profile">Profile</option>
                <option value="preference">Preference</option>
                <option value="project">Project</option>
                <option value="todo">Todo</option>
                <option value="rule">Rule</option>
              </select>
              <button
                type="button"
                onClick={handleAdd}
                className="px-3 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-500"
              >
                Save fact
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {memoryFacts.length === 0 && (
              <p className="text-sm text-slate-500">No memories stored yet.</p>
            )}
            {memoryFacts.map(fact => (
              <div key={fact.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase text-slate-400">{fact.kind}</span>
                  <button
                    type="button"
                    onClick={() => onDeleteFact(fact.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{fact.fact}</p>
                <p className="text-[10px] text-slate-500">Last seen: {new Date(fact.last_seen).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4 space-y-4 text-sm text-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-center">
              <div className="text-2xl font-semibold text-green-400">{cacheStats.hits}</div>
              <div className="text-xs text-slate-400">Hits</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-center">
              <div className="text-2xl font-semibold text-orange-400">{cacheStats.misses}</div>
              <div className="text-xs text-slate-400">Misses</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-center">
              <div className="text-2xl font-semibold text-slate-100">{cacheSize}</div>
              <div className="text-xs text-slate-400">Entries</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-center">
              <div className="text-2xl font-semibold text-slate-100">{hitRate}%</div>
              <div className="text-xs text-slate-400">Hit rate</div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Responses are cached per model for faster repeats. Hit rate is calculated on this session only.
          </p>
        </div>
      )}
    </aside>
  );
};

export default SidePanel;
