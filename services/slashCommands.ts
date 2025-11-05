import { Message, User } from '../types';
import { RecursiveLearningEngine } from './recursiveLearningEngine';

export interface SlashCommand {
  name: string;
  description: string;
  aliases?: string[];
  parameters?: {
    name: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    description?: string;
  }[];
  execute: (args: Record<string, any>, context: CommandContext) => Promise<CommandResult>;
}

export interface CommandContext {
  messages: Message[];
  currentUser: User;
  learningEngine?: RecursiveLearningEngine;
  workspaceId?: string;
}

export interface CommandResult {
  success: boolean;
  output: string;
  data?: any;
  error?: string;
}

export class SlashCommandRegistry {
  private commands: Map<string, SlashCommand> = new Map();

  register(command: SlashCommand) {
    this.commands.set(command.name, command);
    command.aliases?.forEach(alias => {
      this.commands.set(alias, command);
    });
  }

  unregister(name: string) {
    const command = this.commands.get(name);
    if (command) {
      this.commands.delete(name);
      command.aliases?.forEach(alias => this.commands.delete(alias));
    }
  }

  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  getAll(): SlashCommand[] {
    // Return unique commands (filter out aliases)
    const seen = new Set();
    return Array.from(this.commands.values()).filter(cmd => {
      if (seen.has(cmd.name)) return false;
      seen.add(cmd.name);
      return true;
    });
  }

  getAllCommands(): SlashCommand[] {
    return this.getAll();
  }

  async execute(input: string, context: CommandContext): Promise<CommandResult | null> {
    const match = input.match(/^\/(\w+)(?:\s+(.*))?$/);
    if (!match) return null;

    const [, commandName, argsString = ''] = match;
    const command = this.get(commandName);

    if (!command) {
      return {
        success: false,
        output: '',
        error: `Unknown command: /${commandName}`,
      };
    }

    // Parse arguments
    const args = this.parseArguments(argsString, command);

    try {
      return await command.execute(args, context);
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Command execution failed',
      };
    }
  }

  private parseArguments(argsString: string, command: SlashCommand): Record<string, any> {
    const args: Record<string, any> = {};

    if (!command.parameters || command.parameters.length === 0) {
      args.text = argsString.trim();
      return args;
    }

    // Simple space-separated parsing (can be enhanced)
    const parts = argsString.trim().split(/\s+/);
    command.parameters.forEach((param, index) => {
      if (index < parts.length) {
        const value = parts[index];
        args[param.name] = param.type === 'number' ? Number(value) : value;
      }
    });

    return args;
  }
}

// Built-in slash commands
export const builtinCommands: SlashCommand[] = [
  {
    name: 'summarize',
    description: 'Summarize the conversation',
    aliases: ['sum', 'summary'],
    execute: async (args, context) => {
      const messages = context.messages.slice(-10); // Last 10 messages
      const summary = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.senderName}: ${m.content}`)
        .join('\n');

      return {
        success: true,
        output: `**Conversation Summary (last ${messages.length} messages)**\n\n${summary}`,
        data: { messageCount: messages.length },
      };
    },
  },
  {
    name: 'search',
    description: 'Search through memory and facts',
    aliases: ['find'],
    parameters: [
      {
        name: 'query',
        type: 'string',
        required: true,
        description: 'Search query',
      },
    ],
    execute: async (args, context) => {
      if (!context.learningEngine) {
        return {
          success: false,
          output: '',
          error: 'Learning engine not available',
        };
      }

      const query = args.query || args.text || '';
      const facts = context.learningEngine.findRelevantFacts(query, 10);

      if (facts.length === 0) {
        return {
          success: true,
          output: `No facts found for query: "${query}"`,
        };
      }

      const results = facts
        .map((fact, i) => `${i + 1}. ${fact.fact} (${(fact.confidence || 0.5 * 100).toFixed(0)}% confidence)`)
        .join('\n');

      return {
        success: true,
        output: `**Search Results for "${query}"**\n\n${results}`,
        data: { facts },
      };
    },
  },
  {
    name: 'clear',
    description: 'Clear the conversation (keeps memory)',
    execute: async () => {
      return {
        success: true,
        output: 'Conversation cleared. Memory and facts are preserved.',
        data: { action: 'clear' },
      };
    },
  },
  {
    name: 'stats',
    description: 'Show learning statistics',
    execute: async (args, context) => {
      if (!context.learningEngine) {
        return {
          success: false,
          output: '',
          error: 'Learning engine not available',
        };
      }

      const stats = context.learningEngine.getStats();
      const clusters = context.learningEngine.getClusterSummary();

      let output = `**Learning Statistics**\n\n`;
      output += `📊 Total Facts: ${stats.totalFacts}\n`;
      output += `🤖 Auto-Extracted: ${stats.autoExtractedFacts}\n`;
      output += `💯 Avg Confidence: ${(stats.avgConfidence * 100).toFixed(1)}%\n`;
      output += `🔧 Tool Executions: ${stats.totalToolExecutions}\n`;
      output += `✅ Tool Success Rate: ${(stats.toolSuccessRate * 100).toFixed(1)}%\n\n`;

      if (clusters.length > 0) {
        output += `**Fact Clusters**\n`;
        clusters.slice(0, 5).forEach(cluster => {
          output += `• ${cluster.name}: ${cluster.count} facts (${(cluster.avgConfidence * 100).toFixed(0)}%)\n`;
        });
      }

      return {
        success: true,
        output,
        data: { stats, clusters },
      };
    },
  },
  {
    name: 'help',
    description: 'Show available commands',
    execute: async (args, context) => {
      // This will be populated by the registry
      return {
        success: true,
        output: 'Available commands will be listed here',
      };
    },
  },
  {
    name: 'export',
    description: 'Export conversation to file',
    parameters: [
      {
        name: 'format',
        type: 'string',
        required: false,
        description: 'Export format (json, markdown, txt)',
      },
    ],
    execute: async (args, context) => {
      const format = args.format || 'markdown';
      const messages = context.messages;

      let content = '';
      if (format === 'json') {
        content = JSON.stringify(messages, null, 2);
      } else if (format === 'markdown') {
        content = messages
          .map(m => `**${m.senderName}** (${new Date(m.created_at).toLocaleString()})\n${m.content}\n`)
          .join('\n---\n\n');
      } else {
        content = messages
          .map(m => `${m.senderName}: ${m.content}`)
          .join('\n\n');
      }

      // Create download
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${Date.now()}.${format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt'}`;
      a.click();
      URL.revokeObjectURL(url);

      return {
        success: true,
        output: `Conversation exported as ${format}`,
      };
    },
  },
];

export const defaultRegistry = new SlashCommandRegistry();
builtinCommands.forEach(cmd => defaultRegistry.register(cmd));

// Export singleton instance
export const slashCommandsManager = defaultRegistry;
