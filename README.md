# Agentic Infinite Context
_Predictable local LLMs through infinite-context orchestration_

---

## Why Agentic Infinite Context exists

> Local LLMs are fast and private, but they forget who they are.  
> Agentic Infinite Context orchestrates multiple on-device models so each agent keeps its identity and always sees the right context.

Teams that embed LLMs locally (LM Studio, Ollama, GPT4All, etc.) run into three recurring problems:

1. **Identity collapse** – every model thinks it is “the” assistant, even when multiple models share the same conversation.
2. **Context shadowing** – the more history you feed, the harder it is to control who saw what (and how they answer).
3. **Operational opacity** – once prompts are live, it’s tough to prove which model said what and why.

Agentic Infinite Context solves those pain points with a lightweight “conductor” that runs entirely offline. It isolates context per agent, routes turns deterministically, and enforces etiquette (e.g., `@mentions`, `[Agent]:` prefixes, retry-on-mismatch). The result is **infinite-context multi-agent chats** that are reproducible and debuggable—without giving up privacy.

---

## High-level feature set

| Capability | What it unlocks | How it works |
|------------|-----------------|--------------|
| Multi-agent turn planning | Route questions to the right specialist | Detect @mentions, fall back to defaults, enforce concurrency caps |
| Identity guardrails | Prevent denial loops / agent confusion | System prompt scaffolding + automatic retry on wrong prefix |
| Context isolation | Keep answers tidy as history grows | Each agent only sees its own past + global summary + optional RAG facts |
| LM Studio discovery | Zero-config local deployment | Auto-pulls `/v1/models`, merges with overrides, tags availability |
| Model Manager UI | Ops-friendly experience | Rename, override endpoints/API keys, toggle RAG per agent |
| Local persistence | Works offline | Chats, cache, vector-free RAG memories stored in `localStorage` |
| Streaming middleware | Full token streaming on any OpenAI-compatible endpoint | Unified fetch wrapper with SSE parsing, abort support, retry control |
| Observability hooks | “Who said what” auditing | Each turn logs scheduled agents, prompt hashes, routing outcome |

---

## Architecture snapshot

```
┌────────────┐     ┌──────────────────────┐
│   UI (React│     │   Orchestrator       │
│   + Tailwind)│    │  • Mention parser    │
└─────┬───────┘     │  • Turn planner      │
      │              │  • Context router    │
      ▼              │  • Identity guard    │
┌────────────┐       └────────┬────────────┘
│  useLocalDB │                │
│  (state +   │        ┌───────▼────────┐
│  persistence)│       │ Streaming proxy │
└──────────────┘       │ (LM Studio, OSS │
                       │  remote APIs)   │
                       └───────┬─────────┘
                               │
                      ┌────────▼─────────┐
                      │  Models (LLM)    │
                      │  • Mock Gemini   │
                      │  • LM Studio     │
                      │  • Remote GPT OSS│
                      └──────────────────┘
```

- **UI layer** renders routed agents, partial streams, moderator fallback messages, and exposes the Model Manager modal.
- **Orchestrator** owns every turn: it extracts mentions, selects agents, builds isolated prompts, and keeps retry rules declarative.
- **Streaming proxy** unifies OpenAI-compatible calls (LM Studio, Groq, OSS, etc.) and resets state on abort/timeouts.
- **Storage** remains local: `useLocalDB` serializes chats/memory/cache in `localStorage` so nothing leaves the machine.

---

## How Agentic Infinite Context tackles “infinite context”

1. **Smart summarisation** – every turn refreshes a short “thread summary” that acts as shared context across agents.
2. **Per-agent history** – only the agent’s own outputs + fresh user prompt are injected into its prompt window.
3. **Selective RAG** – optional memory snippets (e.g., user preferences) can be toggled per model. No vector database is required by default.
4. **Identity enforcements** – the orchestrator retries once with a corrective system prompt if the model slips, then falls back to a moderator response.

The combination ensures we can scale history without cross-contaminating agent personas—critical for reliable local deployments where log auditing matters.

---

## Getting started

### 1. Install prerequisites
- [Node.js](https://nodejs.org/) 20+ recommended
- (Optional) [LM Studio](https://lmstudio.ai/) running at `http://localhost:1234`

### 2. Bootstrap dependencies
```bash
npm install
```

### 3. Configure environment (if needed)
```bash
cp .env.example .env.local
```
Fill in:
| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Only used for the offline mock provider |
| `LM_STUDIO_ENDPOINT` | Override LM Studio endpoint if it differs |

> `.env.local` is git ignored; keep secrets there.

### 4. Run the dev server
```bash
npm run dev
```
Visit `http://localhost:5173`. Use the header toggle to switch between Offline (mock) and Online (real models).

### 5. Production build
```bash
npm run build
```

### 6. Health check
- `npm run lint` *(optional, add lint config as needed)*
- `npm run preview` to serve the production build locally.

---

## Key workflows

### Scheduling agents
- Mention `@AgentName` in the prompt to directly invite that agent (`@Gemma`, `@Qwen`, etc.).
- If no mention exists, the orchestrator routes to the default agent (first in registry).
- Up to 3 agents can speak per turn; scheduling order is deterministic for repeatability.

### Managing models
- **Discover:** Switching Online calls `GET /v1/models` on LM Studio and auto-populates the picker.
- **Override:** Use “Manage models” to rename, bind API keys, or plug remote OpenAI-compatible endpoints (e.g., GPT-OSS 20B).
- **Reset:** Remove overrides with a single click; defaults are never destroyed.

### Memory handling
- Users can add/delete “facts” (preferences, project info, etc.) via the side panel.
- Facts surface as short bullet prompts when `useRag` is enabled for a model.

### Moderation flows
- Identity mismatch or streaming errors yield a moderator message (e.g., “Qwen timed out”).
- Developers can hook into the orchestration events to log `turn_id`, `agent_id`, `prompt_hash` for auditing.

---

## Project structure

```
├─ components/         # UI primitives: header, chat window, model manager, etc.
├─ hooks/
│  ├─ useLocalDB.ts    # persistence layer (localStorage)
│  └─ useModelManager.ts # merge LIVE models + overrides
├─ services/
│  └─ aiService.ts     # streaming + non-streaming adapters
├─ constants.ts        # default agents, user roster
├─ types.ts            # shared domain types
├─ App.tsx             # orchestration + routing logic
├─ README.md
├─ package.json
└─ .env.example
```

---

## Roadmap

- [ ] **Automated regression tests** – scripted runs for AT-01…AT-04.
- [ ] **Pluggable memory backends** – swap local facts for sqlite/Chroma if needed.
- [ ] **Observation mode** – optional sidebar logging prompt hashes & routing decisions.
- [ ] **Moderator summary agent** – configurable “merge” voice for multi-agent turns.
- [ ] **Desktop build** – wrap in Tauri/Electron for non-dev operators.

Have ideas? [Open an issue](https://github.com/your-org/agentic-infinite-context/issues) or drop a PR.

---

## Contributing

1. Fork & clone this repo.
2. `npm install`
3. Create a feature branch (`git checkout -b feature/upgrades`).
4. Add tests or screenshots when touching the orchestrator.
5. Open a pull request referencing any related issues.

By contributing, you agree that all submissions will be released under the project’s LICENSE (coming soon).

---

## License

Agentic Infinite Context is released under the [MIT License](./LICENSE).

---

> Agentic Infinite Context makes local LLMs dependable.  
> No more “Who am I?” confusion—just reliable, infinite-context conversations on your own hardware.
