import { Message, MemoryFact, ToolCall, User, Role } from "../types";
import crypto from "crypto-js";

export interface AiResult {
  response: string;
  extractedFact?: MemoryFact;
  extractedFacts?: MemoryFact[];
  toolCall?: ToolCall;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (finalText: string) => void;
  onError: (message: string) => void;
}

interface ChatStreamOptions extends StreamCallbacks {
  prompt: string;
  model: string;
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  streamingProtocol?: "sse" | "chunk" | "none";
  currentUser: User;
  participants: User[];
  context: Message[];
  memory: MemoryFact[];
  summary?: string;
  systemPromptOverride?: string;
  signal?: AbortSignal;
}

interface ChatCompletionOptions {
  prompt: string;
  model: string;
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  currentUser: User;
  participants: User[];
  context: Message[];
  memory: MemoryFact[];
  summary?: string;
  systemPromptOverride?: string;
}

export const factExtractionRegex = /remember that my (.*?) is (.*)/i;

interface BuildMessagesParams {
  prompt: string;
  currentUser: User;
  participants: User[];
  context: Message[];
  memory: MemoryFact[];
  summary?: string;
  systemPromptOverride?: string;
}

const buildMessagesForApi = ({
  prompt,
  currentUser,
  participants,
  context,
  memory,
  summary,
  systemPromptOverride,
}: BuildMessagesParams) => {
  const systemSections: string[] = [];

  if (summary) {
    systemSections.push(`Thread summary:\n${summary}`);
  }

  if (systemPromptOverride) {
    systemSections.push(systemPromptOverride);
  } else {
    let systemPrompt = "You are a helpful local AI assistant in a group chat.";
    systemPrompt += ` Participants: ${participants.map(p => p.name).join(", ")}.`;
    systemPrompt += ` The current speaker is ${currentUser.name}.`;
    systemPrompt += " Be concise and useful.";
    systemSections.push(systemPrompt);
  }

  if (memory.length > 0) {
    const facts = memory
      .slice(0, 6)
      .map(fact => `- ${fact.fact}`)
      .join("\n");
    systemSections.push(`Relevant facts (reference only):\n${facts}`);
  }

  const systemContent = systemSections.join("\n\n");

  const history = context.map(msg => {
    if (msg.role === Role.User) {
      return { role: "user", content: `${msg.senderName}: ${msg.content}` } as const;
    }
    if (msg.role === Role.Assistant) {
      return { role: "assistant", content: msg.content } as const;
    }
    if (msg.role === Role.Tool) {
      return { role: "tool", content: msg.content } as const;
    }
    return { role: "assistant", content: msg.content } as const;
  });

  return [
    { role: "system", content: systemContent },
    ...history,
    { role: "user", content: `${currentUser.name}: ${prompt}` },
  ];
};

export const getMockAiResponse = (
  prompt: string,
  currentUser: User,
  participants: User[],
  context: Message[],
  memory: MemoryFact[],
): Promise<AiResult> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const factMatch = prompt.match(factExtractionRegex);
      if (factMatch) {
        const [, key, value] = factMatch;
        const newFact: MemoryFact = {
          id: crypto.lib.WordArray.random(16).toString(),
          kind: "profile",
          fact: `${currentUser.name}'s ${key} is ${value}`,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          source_message_id: context.find(m => m.content === prompt)?.id,
        };
        resolve({
          response: `Got it, ${currentUser.name}. I'll remember that your ${key} is ${value}.`,
          extractedFact: newFact,
        });
        return;
      }

      if (prompt.includes("convert") && prompt.includes("video") && prompt.includes("ffmpeg")) {
        resolve({
          response: `Sure thing, ${currentUser.name}. I can do that. Here is the proposed command.`,
          toolCall: { name: "ffmpeg", args: { input: "input.mov", output: "output.mp4" } },
        });
        return;
      }

      if (prompt.includes("what is my editor")) {
        if (memory.length > 0) {
          const editorFact = memory.find(f => f.fact.toLowerCase().includes("editor"));
          if (editorFact) {
            resolve({ response: `Based on my memory, ${editorFact.fact}.` });
            return;
          }
        }
        resolve({ response: `I don't have that in my memory for you, ${currentUser.name}.` });
        return;
      }

      let responseText = `That's an interesting question, ${currentUser.name}.`;

      const lastMessage = context[context.length - 1];
      if (
        lastMessage &&
        lastMessage.senderId !== currentUser.id &&
        participants.some(p => p.id === lastMessage.senderId)
      ) {
        responseText = `Thanks for your input, ${currentUser.name}. In response to ${lastMessage.senderName}, I'd say...`;
      } else if (prompt.toLowerCase().includes("hello") || prompt.toLowerCase().includes("hi")) {
        responseText = `Hello, ${currentUser.name}! How can I help this group today?`;
      } else if (prompt.toLowerCase().includes("help")) {
        responseText =
          'I can help with a variety of tasks. Try asking me to remember something personal, or request a tool command like "use ffmpeg to convert a video".';
      }

      resolve({ response: responseText });
    }, 800 + Math.random() * 800);
  });
};

const mergeHeaders = (apiKey?: string, extra?: Record<string, string>) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  if (extra) {
    Object.assign(headers, extra);
  }
  return headers;
};

export const streamChatCompletion = async ({
  prompt,
  model,
  endpoint,
  apiKey,
  headers,
  streamingProtocol = "sse",
  currentUser,
  participants,
  context,
  memory,
  summary,
  systemPromptOverride,
  signal,
  onToken,
  onComplete,
  onError,
}: ChatStreamOptions): Promise<void> => {
  const factMatch = prompt.match(factExtractionRegex);
  if (factMatch) {
    const [, key, value] = factMatch;
    const acknowledgement = `OK, ${currentUser.name}. I've stored in my vector memory that your ${key} is ${value}.`;
    onComplete(acknowledgement);
    return;
  }

  const wantsStream = streamingProtocol !== "none";
  const messages = buildMessagesForApi({
    prompt,
    currentUser,
    participants,
    context,
    memory,
    summary,
    systemPromptOverride,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: mergeHeaders(apiKey, headers),
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        stream: wantsStream,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Chat completion API error:", response.status, errorBody);
      onError(`Error ${response.status}: Unable to reach ${endpoint}`);
      return;
    }

    if (!wantsStream || !response.body) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response.";
      onComplete(content);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let accumulated = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);
        if (chunk.length === 0) {
          boundary = buffer.indexOf("\n\n");
          continue;
        }

        const lines = chunk.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) {
            continue;
          }
          const payload = trimmed.slice(5).trim();
          if (!payload) {
            continue;
          }
          if (payload === "[DONE]") {
            onComplete(accumulated.trim());
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated += delta;
              onToken(delta);
            }
          } catch (error) {
            console.error("Failed to parse stream payload", error, payload);
          }
        }

        boundary = buffer.indexOf("\n\n");
      }
    }

    if (buffer.trim().length > 0) {
      try {
        const payload = buffer.trim().replace(/^data:\s*/, "");
        if (payload && payload !== "[DONE]") {
          const parsed = JSON.parse(payload);
          const delta =
            parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? "";
          if (delta) {
            accumulated += delta;
            onToken(delta);
          }
        }
      } catch (error) {
        console.error("Failed to parse trailing payload", error, buffer);
      }
    }

    onComplete(accumulated.trim());
  } catch (error: any) {
    if (error?.name === "AbortError") {
      onError("Stream cancelled.");
      return;
    }
    console.error("Chat completion request failed", error);
    onError(`Request failed: ${error?.message ?? "unknown error"}`);
  }
};

export const getChatCompletion = async ({
  prompt,
  model,
  endpoint,
  apiKey,
  headers,
  currentUser,
  participants,
  context,
  memory,
  summary,
  systemPromptOverride,
}: ChatCompletionOptions): Promise<AiResult> => {
  const messages = buildMessagesForApi({
    prompt,
    currentUser,
    participants,
    context,
    memory,
    summary,
    systemPromptOverride,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: mergeHeaders(apiKey, headers),
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Chat completion API error:", response.status, errorBody);
      return { response: `Error ${response.status}: Unable to reach ${endpoint}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response.";

    return { response: content };
  } catch (error) {
    console.error("Chat completion request failed", error);
    return { response: `Request failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
};
