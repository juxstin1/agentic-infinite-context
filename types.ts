export enum Role {
  System = "system",
  User = "user",
  Assistant = "assistant",
  Tool = "tool",
}

export type Model = string;

export type ModelOrigin = "mock" | "lmstudio" | "remote-default" | "custom";

export interface ModelConfig {
  id: Model;
  label: string;
  provider: "mock" | "lmstudio" | "openai";
  model?: string;
  endpoint?: string;
  apiKey?: string;
  streamingProtocol?: "sse" | "chunk" | "none";
  useRag?: boolean;
  headers?: Record<string, string>;
  isDefault?: boolean;
  origin?: ModelOrigin;
  hasCustomConfig?: boolean;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

export interface Message {
  id: string;
  chat_id: string;
  role: Role;
  senderId: string;
  senderName: string;
  content: string;
  modelId?: string;
  modelLabel?: string;
  toolCall?: ToolCall;
  created_at: string;
}

export interface Chat {
  id: string;
  created_at: string;
  title: string;
  participants: User[];
}

export interface MemoryFact {
  id: string;
  owner?: string;
  kind: "preference" | "profile" | "project" | "todo" | "rule";
  fact: string;
  weight?: number;
  first_seen: string;
  last_seen: string;
  source_message_id?: string;
  // Recursive learning fields
  usage_count?: number;
  success_count?: number;
  confidence?: number;
  auto_extracted?: boolean;
}

export interface CacheEntry {
  key_hash: string;
  response_json: string;
  created_at: string;
  ttl_sec: number;
}

export interface StreamingResponse {
  id: string;
  modelId: Model;
  modelLabel: string;
  content: string;
  status: "streaming" | "error";
  error?: string;
}

export enum OutputLineType {
  Command = "command",
  Error = "error",
  Success = "success",
  Info = "info",
  System = "system",
  Header = "header",
  Separator = "separator",
  Ascii = "ascii",
  AgentResponse = "agentResponse",
  UserChatMessage = "userChatMessage",
  ModelChatMessage = "modelChatMessage",
  Suggestion = "suggestion",
  Text = "text"
}

export interface AgentInfo {
  type: string;
  color: string;
  icon: string;
}

export interface OutputLine {
  type: OutputLineType;
  content: string;
  agent?: AgentInfo;
  actionableCode?: string;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ToolExecutor {
  name: string;
  description: string;
  execute: (args: Record<string, any>) => Promise<ToolResult>;
  validate?: (args: Record<string, any>) => boolean;
}

export interface ToolMemory {
  id: string;
  tool_name: string;
  context_pattern: string;
  success_count: number;
  failure_count: number;
  total_executions: number;
  common_args: Record<string, any>;
  failure_modes: string[];
  last_used: string;
  created_at: string;
}

export interface MessageFeedback {
  message_id: string;
  thumbs_up?: boolean;
  thumbs_down?: boolean;
  correction?: string;
  ignored?: boolean;
  created_at: string;
}

export interface PromptPerformance {
  id: string;
  prompt_hash: string;
  prompt_snippet: string;
  model_id: string;
  success_count: number;
  failure_count: number;
  total_uses: number;
  avg_response_quality: number;
  context_types: string[];
  last_used: string;
  created_at: string;
}
