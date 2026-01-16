# Agentic Infinite Context

> **A self-improving AI workspace that learns with you**
> _Workspace-first architecture • Recursive learning • Local-first privacy • Production-ready_

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)]()
[![React](https://img.shields.io/badge/React-18-61dafb)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ What is Agentic Infinite Context?

**Agentic Infinite Context** is a professional AI workspace application that combines the power of local LLMs with intelligent memory management, semantic search, and recursive learning capabilities. Built with a clean, expandable architecture inspired by AnythingLLM, it provides a uniform and intentional user experience.

### Key Differentiators

- **🧠 Recursive Learning** – Auto-extracts facts from conversations, builds semantic memory, improves with usage
- **🗂️ Workspace-First** – Isolated contexts for different projects, each with their own memory and settings
- **🔍 BM25 Semantic Search** – Find relevant facts without GPU-heavy embeddings
- **⚡ Unified Commands** – Slash commands, skills, tools, and MCP servers in one registry
- **🏠 Local-First** – All data stays on your machine, works completely offline
- **🎨 Premium UX** – Apple-inspired design with glassmorphism and smooth animations
- **🏗️ Clean Architecture** – Expandable service layers, clear boundaries, maintainable codebase

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ recommended
- **npm** or **yarn**
- *(Optional)* [LM Studio](https://lmstudio.ai/) running at `http://localhost:1234`

### Installation

```bash
# Clone the repository
git clone https://github.com/juxstin1/agentic-infinite-context.git
cd agentic-infinite-context

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see your AI workspace!

### Production Build

```bash
npm run build
npm run preview
```

---

## 🏗️ Architecture

Agentic Infinite Context follows a clean, layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│          UI Layer (React Components)        │
│  • AppLayout, EnhancedChatWindow            │
│  • CommandPalette, SettingsPanel            │
│  • Presentation-only, no business logic     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       Application Layer (Contexts)          │
│  • WorkspaceContext (active workspace)      │
│  • ChatContext (messages, streaming)        │
│  • ThemeContext (user preferences)          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       Business Logic Layer (Services)       │
│  • LearningService (memory + BM25)          │
│  • ChatService (AI completions)             │
│  • CommandService (unified commands)        │
│  • ModelService (discovery + management)    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       Data Layer (Persistence)              │
│  • useLocalDB (workspace-scoped storage)    │
│  • localStorage (offline-first)             │
└─────────────────────────────────────────────┘
```

### Service Layer Highlights

#### **LearningService**
- **BM25 semantic search** for finding relevant facts
- **Auto-fact extraction** with 5 pattern matchers (preferences, profiles, projects, todos, names)
- **Usage tracking** and confidence scoring
- **Cluster summaries** by fact category
- Browser-compatible, no Node.js dependencies

#### **ChatService**
- **Streaming completions** with token-by-token updates
- **Workspace-aware system prompts**
- **Mock responses** for testing without API keys
- **OpenAI-compatible** endpoints (works with LM Studio, Ollama, etc.)

#### **CommandService**
- **Unified registry** for slash commands, tools, skills, and MCP servers
- **4 built-in slash commands**: `/summarize`, `/search`, `/clear`, `/help`
- **4 built-in skills**: code-review, debug, explain, research
- **Extensible** - add new command types easily

#### **ModelService**
- **Workspace-scoped** model selection
- **Auto-discovery** of LM Studio models
- **Custom models** with API key management
- **Enable/disable** models per workspace

---

## 🎯 Core Features

### 🗂️ Workspaces

Organize your AI interactions by project or context:

- **Isolated conversations** – Each workspace has its own chat history
- **Workspace-specific memory** – Facts are scoped to workspaces
- **Custom system prompts** – Set the AI's behavior per workspace
- **Model preferences** – Choose which models are available per workspace
- **Quick switching** – Jump between workspaces with Command Palette (⌘K)

### 🧠 Recursive Learning

Your AI gets smarter as you use it:

- **Auto-fact extraction** – Captures preferences, projects, and context automatically
- **Semantic search** – BM25 algorithm finds relevant facts without embeddings
- **Usage tracking** – Facts are reinforced when they're helpful
- **Confidence scoring** – Learn which information is most reliable
- **5 fact categories**: preferences, profiles, projects, todos, rules

**Example patterns:**
```
"Remember that my editor is VS Code"  → Auto-extracted as preference
"I prefer TypeScript over JavaScript"  → Auto-extracted as preference
"I'm working on a React dashboard"    → Auto-extracted as project
"Don't forget to add tests"           → Auto-extracted as todo
"My name is Alex"                     → Auto-extracted as profile
```

### ⚡ Commands & Skills

#### Slash Commands
Execute actions directly from chat:

- `/summarize` – Summarize the current conversation
- `/search <query>` – Search through your memory facts
- `/clear` – Start a fresh conversation
- `/help` – Show all available commands

#### Skills
Pre-configured AI behaviors for specific tasks:

- **code-review** – Expert code reviewer analyzing for bugs and best practices
- **debug** – Systematic debugging assistance
- **explain** – Clear explanations with examples and analogies
- **research** – Comprehensive research and information gathering

Access via Command Palette (⌘K) or they auto-trigger based on keywords.

### 🎨 Premium Design System

- **Dark gradient backgrounds** with subtle animations
- **Glassmorphism** effects for depth and clarity
- **3-level elevation** system (soft, lift, glow)
- **Smooth transitions** powered by Framer Motion
- **Custom scrollbars** that match the aesthetic
- **8px spacing rhythm** for visual consistency

---

## 📖 Usage Examples

### Basic Chat

```typescript
// Just start chatting - the AI remembers context
User: "I prefer dark mode in all my apps"
AI: "Got it! I'll remember you prefer dark mode."

// Later...
User: "What are my preferences?"
AI: "You prefer dark mode in all your apps."
```

### Using Commands

```bash
# In chat input
/search react
/summarize
/clear
```

### Workspace Management

1. **Create workspace**: Click sidebar → New Workspace
2. **Switch workspace**: Command Palette (⌘K) → Search workspace name
3. **Configure**: Settings Panel → System Prompts

### Model Selection

```typescript
// Switch between offline/online mode
- Offline: Uses mock model for testing
- Online: Discovers LM Studio models automatically

// Add custom model
Settings → Models → Add Custom Model
```

---

## 🗂️ Project Structure

```
agentic-infinite-context/
├── components/           # React components
│   ├── chat/            # Chat-related components
│   ├── layout/          # App layout, sidebar, panels
│   ├── settings/        # Settings UI components
│   └── ui/              # Base UI primitives
├── contexts/            # React contexts for state
│   ├── ChatContext.tsx      # Chat & message management
│   ├── WorkspaceContext.tsx # Workspace management
│   └── ThemeContext.tsx     # Theme preferences
├── hooks/               # Custom React hooks
│   ├── useLocalDB.ts        # Workspace-scoped storage
│   └── useModelManager.ts   # Model management (deprecated)
├── services/            # Business logic layer
│   ├── LearningService.ts   # Memory + semantic search
│   ├── ChatService.ts       # AI completions
│   ├── CommandService.ts    # Unified commands
│   └── ModelService.ts      # Model discovery
├── utils/               # Shared utilities
│   └── ids.ts              # ID generation
├── design-system/       # Design tokens & utilities
├── types.ts             # TypeScript type definitions
├── constants.ts         # App constants
└── App.tsx              # Main application (413 lines!)
```

### Code Quality Metrics

- **App.tsx**: 413 lines (clean, focused)
- **Services**: 4 unified services (legacy files removed)
- **TypeScript**: Strongly typed with proper error handling
- **Build time**: ~8 seconds
- **Bundle size**: 531 kB (optimized)

---

## 🔧 Configuration

### Environment Variables

Create `.env.local` (git-ignored):

```bash
# Optional - for remote models
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Optional - override LM Studio endpoint
VITE_LM_STUDIO_ENDPOINT=http://localhost:1234
```

### Workspace Configuration

Each workspace can have:
- **System prompt** – Customize AI behavior
- **Enabled models** – Choose which models are available
- **Default model** – Set the preferred model
- **Slash commands** – Custom shortcuts (coming soon)
- **Skills** – Enabled AI behaviors

---

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -t agentic-infinite-context .

# Run container
docker run -p 5173:5173 agentic-infinite-context
```

### Static Hosting

```bash
# Build
npm run build

# Deploy dist/ folder to:
# - Vercel, Netlify, GitHub Pages
# - Any static hosting service
```

### Desktop App (Coming Soon)

Package as Electron or Tauri app for native desktop experience.

---

## 🛣️ Roadmap

### v1.1 (Next Release)
- [ ] **Skill auto-triggering** – Skills activate based on message keywords
- [ ] **MCP server connections** – Integrate real Model Context Protocol servers
- [ ] **Enhanced fact clustering** – Visual exploration of knowledge graph
- [ ] **Export/Import** – Share workspaces and configurations
- [ ] **Tool execution** – Run tools directly from chat

### v1.2
- [ ] **Vector embeddings** – Optional GPU-accelerated semantic search
- [ ] **Voice input** – Whisper integration for speech-to-text
- [ ] **Collaborative workspaces** – Share workspaces with teams (local network)
- [ ] **Plugin system** – Third-party extensions

### v2.0
- [ ] **Desktop builds** – Tauri/Electron packaging
- [ ] **Mobile app** – React Native version
- [ ] **Advanced reasoning** – Chain-of-thought, tree-of-thoughts patterns
- [ ] **Multi-modal** – Image understanding and generation

Want to contribute? Open a pull request!

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow existing architecture patterns (contexts + services)
- Maintain TypeScript type safety
- Write clean, self-documenting code
- Update tests when adding features
- Keep components focused and composable

### Code Standards

```typescript
// ✅ Good - Clear service with single responsibility
export class FeatureService {
  doOneThing(): void {
    // Implementation
  }
}

// ❌ Bad - God object with multiple responsibilities
export class EverythingManager {
  doChat(): void {}
  doStorage(): void {}
  doModels(): void {}
  // Too much!
}
```

---

## 📚 Documentation

Documentation is provided inline in this README. Additional docs coming soon.

---

## 🙏 Acknowledgments

Built with love using:

- **React** – UI framework
- **TypeScript** – Type safety
- **Vite** – Build tool
- **Tailwind CSS** – Styling
- **Framer Motion** – Animations
- **Lucide React** – Icons
- **LM Studio** – Local LLM runtime

Design inspired by:
- **AnythingLLM** – Clean architecture patterns
- **Apple** – Premium design language
- **Linear** – Attention to detail

Special thanks to the open-source community for making projects like this possible!

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](./LICENSE) file for details.

---

## 🔗 Links

- **Issue Tracker**: [GitHub Issues](https://github.com/juxstin1/agentic-infinite-context/issues)
- **Discussions**: [GitHub Discussions](https://github.com/juxstin1/agentic-infinite-context/discussions)

---

## 💡 Philosophy

> **"Local AI should be intelligent, not just private."**

Agentic Infinite Context proves that local LLMs can be as smart and capable as cloud services. By combining:

- **Recursive learning** that improves with use
- **Semantic memory** that remembers what matters
- **Clean architecture** that's easy to extend
- **Premium UX** that's delightful to use

...we create an AI workspace that truly works *with* you, not just *for* you.

---

<div align="center">

**Made with ❤️ for the local AI community**

⭐ Star this repo if you find it useful!

</div>
