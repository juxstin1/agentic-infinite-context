import { Message, MemoryFact, User, Role, ModelConfig } from "../types";
import { Workspace } from "../contexts/WorkspaceContext";

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (finalText: string) => void;
  onError: (error: string) => void;
}

export interface ChatCompletionOptions {
  prompt: string;
  model: ModelConfig;
  currentUser: User;
  participants: User[];
  context: Message[];
  memory: MemoryFact[];
  workspace?: Workspace;
  signal?: AbortSignal;
}

export interface StreamingOptions extends ChatCompletionOptions {
  callbacks: StreamCallbacks;
}

/**
 * ChatService handles AI completions and streaming
 * Consolidates aiService functionality and streaming logic
 */
export class ChatService {
  /**
   * Build messages array for API request
   */
  private buildMessages(options: ChatCompletionOptions): Array<{ role: string; content: string }> {
    const { prompt, currentUser, participants, context, memory, workspace } = options;

    // Build system prompt
    const systemSections: string[] = [];

    // Use workspace system prompt if available
    if (workspace?.systemPrompt) {
      systemSections.push(workspace.systemPrompt);
    } else {
      let systemPrompt = "You are a helpful AI assistant in a conversation.";
      systemPrompt += ` Participants: ${participants.map(p => p.name).join(", ")}.`;
      systemPrompt += ` The current speaker is ${currentUser.name}.`;
      systemPrompt += " Be concise and helpful.";
      systemSections.push(systemPrompt);
    }

    // Add memory facts if available
    if (memory.length > 0) {
      const facts = memory
        .slice(0, 6)
        .map(fact => `- ${fact.fact}`)
        .join("\n");
      systemSections.push(`Relevant facts:\n${facts}`);
    }

    const systemContent = systemSections.join("\n\n");

    // Build message history
    const history = context.map(msg => {
      if (msg.role === Role.User) {
        return { role: "user", content: `${msg.senderName}: ${msg.content}` };
      }
      if (msg.role === Role.Assistant) {
        return { role: "assistant", content: msg.content };
      }
      if (msg.role === Role.Tool) {
        return { role: "tool", content: msg.content };
      }
      return { role: "assistant", content: msg.content };
    });

    return [
      { role: "system", content: systemContent },
      ...history,
      { role: "user", content: `${currentUser.name}: ${prompt}` },
    ];
  }

  /**
   * Get mock AI response (for testing/development)
   */
  async getMockResponse(options: ChatCompletionOptions): Promise<string> {
    const { prompt, currentUser } = options;

    // Simple mock responses
    if (prompt.toLowerCase().includes("hello")) {
      return `Hi ${currentUser.name}! How can I help you today?`;
    }

    if (prompt.toLowerCase().includes("help")) {
      return `I'm here to assist you, ${currentUser.name}. What would you like to know?`;
    }

    return `I understand you said: "${prompt}". How can I help with that?`;
  }

  /**
   * Stream chat completion from API
   */
  async streamCompletion(options: StreamingOptions): Promise<void> {
    const { model, callbacks, signal } = options;

    try {
      // Build request
      const messages = this.buildMessages(options);
      const requestBody = {
        model: model.model || model.id,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      };

      // If it's a mock model, use mock streaming
      if (model.provider === 'mock') {
        return this.streamMockResponse(options);
      }

      // Make API request
      const endpoint = model.endpoint || 'http://localhost:1234/v1/chat/completions';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(model.apiKey && { 'Authorization': `Bearer ${model.apiKey}` }),
          ...model.headers,
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              callbacks.onComplete(buffer);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                callbacks.onToken(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      callbacks.onComplete(buffer);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          callbacks.onError('Request cancelled');
        } else {
          callbacks.onError(error.message || 'Unknown error occurred');
        }
      } else {
        callbacks.onError('Unknown error occurred');
      }
    }
  }

  /**
   * Mock streaming response for testing
   */
  private async streamMockResponse(options: StreamingOptions): Promise<void> {
    const { callbacks } = options;
    const mockResponse = await this.getMockResponse(options);

    // Simulate streaming by sending one word at a time
    const words = mockResponse.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const token = i === words.length - 1 ? words[i] : words[i] + ' ';
      callbacks.onToken(token);
    }

    callbacks.onComplete(mockResponse);
  }

  /**
   * Non-streaming chat completion
   */
  async chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const { model, signal } = options;

    // If it's a mock model, return mock response
    if (model.provider === 'mock') {
      return this.getMockResponse(options);
    }

    // Build request
    const messages = this.buildMessages(options);
    const requestBody = {
      model: model.model || model.id,
      messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 2000,
    };

    // Make API request
    const endpoint = model.endpoint || 'http://localhost:1234/v1/chat/completions';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(model.apiKey && { 'Authorization': `Bearer ${model.apiKey}` }),
        ...model.headers,
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

// Singleton instance
export const chatService = new ChatService();
