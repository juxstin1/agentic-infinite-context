import { User, ModelConfig } from "./types";

export const USERS: User[] = [
  { id: "user_you", name: "You", initials: "You", color: "bg-purple-600" },
  { id: "user_bob", name: "Bob", initials: "B", color: "bg-sky-600" },
  { id: "user_alice", name: "Alice", initials: "A", color: "bg-rose-600" },
];

export const ASSISTANT_USER: User = {
  id: "assistant",
  name: "Local Assistant",
  initials: "AI",
  color: "bg-gradient-to-br from-purple-500 to-cyan-500",
};

export const PROVIDER_DEFAULT_ENDPOINT: Record<ModelConfig["provider"], string> = {
  mock: "",
  lmstudio: "http://localhost:1234/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
};

export const MOCK_MODEL: ModelConfig = {
  id: "mock/gemini-pro",
  label: "Mock Gemini",
  provider: "mock",
  model: "mock/gemini-pro",
  streamingProtocol: "sse",
  useRag: true,
  isDefault: true,
  origin: "mock",
};

export const DEFAULT_REMOTE_MODELS: ModelConfig[] = [
  {
    id: "gpt-oss-20b",
    label: "GPT OSS 20B",
    provider: "openai",
    model: "gpt-oss-20b",
    endpoint: "https://api.your-oss-provider.com/v1/chat/completions",
    streamingProtocol: "sse",
    useRag: true,
    isDefault: true,
    origin: "remote-default",
  },
];

export const MAX_CONCURRENT_MODELS = 3;
