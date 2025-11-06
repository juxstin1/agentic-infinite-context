import { createId } from '../utils/ids';

/**
 * Unified command types
 */
export type CommandType = 'slash' | 'tool' | 'skill' | 'mcp';
export type CommandCategory = 'coding' | 'writing' | 'analysis' | 'research' | 'utility' | 'custom';

/**
 * Base command interface
 */
export interface BaseCommand {
  id: string;
  type: CommandType;
  name: string;
  description: string;
  category?: CommandCategory;
  aliases?: string[];
  workspaceId?: string;
}

/**
 * Slash command (e.g., /summarize, /search)
 */
export interface SlashCommand extends BaseCommand {
  type: 'slash';
  parameters?: Array<{
    name: string;
    description: string;
    required: boolean;
    type: 'string' | 'number' | 'boolean';
  }>;
  execute: (args: Record<string, any>) => Promise<string>;
}

/**
 * Tool command (executable actions)
 */
export interface ToolCommand extends BaseCommand {
  type: 'tool';
  execute: (args: Record<string, any>) => Promise<{
    success: boolean;
    output: string;
    error?: string;
  }>;
  validate?: (args: Record<string, any>) => boolean;
}

/**
 * Skill (AI behavior/prompt)
 */
export interface SkillCommand extends BaseCommand {
  type: 'skill';
  prompt: string;
  keywords: string[];
  autoTrigger?: {
    enabled: boolean;
    patterns: string[];
  };
}

/**
 * MCP (Model Context Protocol) command
 */
export interface MCPCommand extends BaseCommand {
  type: 'mcp';
  serverId: string;
  serverName: string;
  endpoint?: string;
  status: 'connected' | 'disconnected' | 'error';
}

export type Command = SlashCommand | ToolCommand | SkillCommand | MCPCommand;

/**
 * CommandService provides a unified registry for all command types
 * Consolidates: SlashCommandRegistry, ToolExecutor, SkillFilesManager, MCPServerManager
 */
export class CommandService {
  private commands: Map<string, Command> = new Map();

  constructor() {
    this.registerBuiltinCommands();
  }

  /**
   * Register built-in commands
   */
  private registerBuiltinCommands(): void {
    // Built-in slash commands
    this.registerSlashCommand({
      id: 'cmd-summarize',
      type: 'slash',
      name: 'summarize',
      description: 'Summarize the conversation',
      aliases: ['sum'],
      execute: async () => 'Summarizing conversation...',
    });

    this.registerSlashCommand({
      id: 'cmd-search',
      type: 'slash',
      name: 'search',
      description: 'Search through memory and facts',
      parameters: [
        { name: 'query', description: 'Search query', required: true, type: 'string' }
      ],
      execute: async (args) => `Searching for: ${args.query}`,
    });

    this.registerSlashCommand({
      id: 'cmd-clear',
      type: 'slash',
      name: 'clear',
      description: 'Clear the current chat',
      execute: async () => 'Chat cleared',
    });

    this.registerSlashCommand({
      id: 'cmd-help',
      type: 'slash',
      name: 'help',
      description: 'Show available commands',
      execute: async () => {
        const commands = this.getAllCommands();
        return commands.map(cmd => `/${cmd.name} - ${cmd.description}`).join('\n');
      },
    });

    // Built-in skills
    this.registerSkill({
      id: 'skill-code-review',
      type: 'skill',
      name: 'code-review',
      description: 'Review code for best practices and issues',
      category: 'coding',
      prompt: 'You are an expert code reviewer. Analyze code for bugs, performance issues, security vulnerabilities, and best practices.',
      keywords: ['review', 'code', 'analyze'],
    });

    this.registerSkill({
      id: 'skill-debug',
      type: 'skill',
      name: 'debug',
      description: 'Help debug code and find issues',
      category: 'coding',
      prompt: 'You are a debugging expert. Help identify and fix bugs in code systematically.',
      keywords: ['debug', 'bug', 'error', 'fix'],
    });

    this.registerSkill({
      id: 'skill-explain',
      type: 'skill',
      name: 'explain',
      description: 'Explain complex concepts clearly',
      category: 'analysis',
      prompt: 'You are a teacher. Explain concepts clearly and thoroughly, using examples and analogies.',
      keywords: ['explain', 'what', 'how', 'why'],
    });

    this.registerSkill({
      id: 'skill-research',
      type: 'skill',
      name: 'research',
      description: 'Research topics and provide comprehensive information',
      category: 'research',
      prompt: 'You are a researcher. Provide comprehensive, well-researched information on topics.',
      keywords: ['research', 'find', 'learn', 'information'],
    });
  }

  /**
   * Register a slash command
   */
  registerSlashCommand(command: Omit<SlashCommand, 'id'> & Partial<Pick<SlashCommand, 'id'>>): void {
    const cmd: SlashCommand = {
      id: command.id || createId(),
      ...command,
    };
    this.commands.set(cmd.id, cmd);
  }

  /**
   * Register a tool command
   */
  registerTool(tool: Omit<ToolCommand, 'id'> & Partial<Pick<ToolCommand, 'id'>>): void {
    const cmd: ToolCommand = {
      id: tool.id || createId(),
      ...tool,
    };
    this.commands.set(cmd.id, cmd);
  }

  /**
   * Register a skill
   */
  registerSkill(skill: Omit<SkillCommand, 'id'> & Partial<Pick<SkillCommand, 'id'>>): void {
    const cmd: SkillCommand = {
      id: skill.id || createId(),
      ...skill,
    };
    this.commands.set(cmd.id, cmd);
  }

  /**
   * Register an MCP server
   */
  registerMCPServer(mcp: Omit<MCPCommand, 'id'> & Partial<Pick<MCPCommand, 'id'>>): void {
    const cmd: MCPCommand = {
      id: mcp.id || createId(),
      ...mcp,
    };
    this.commands.set(cmd.id, cmd);
  }

  /**
   * Get all commands
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by type
   */
  getCommandsByType(type: CommandType): Command[] {
    return this.getAllCommands().filter(cmd => cmd.type === type);
  }

  /**
   * Get commands by workspace
   */
  getCommandsByWorkspace(workspaceId: string): Command[] {
    return this.getAllCommands().filter(cmd =>
      !cmd.workspaceId || cmd.workspaceId === workspaceId
    );
  }

  /**
   * Get command by name
   */
  getCommandByName(name: string): Command | undefined {
    return this.getAllCommands().find(cmd =>
      cmd.name === name || cmd.aliases?.includes(name)
    );
  }

  /**
   * Execute a command
   */
  async executeCommand(nameOrId: string, args: Record<string, any> = {}): Promise<any> {
    const command = this.getCommandByName(nameOrId) || this.commands.get(nameOrId);
    if (!command) {
      throw new Error(`Command not found: ${nameOrId}`);
    }

    switch (command.type) {
      case 'slash':
        return (command as SlashCommand).execute(args);
      case 'tool':
        return (command as ToolCommand).execute(args);
      case 'skill':
        // Skills don't execute directly, they modify system prompts
        return { prompt: (command as SkillCommand).prompt };
      case 'mcp':
        throw new Error('MCP commands require external execution');
      default:
        throw new Error(`Unknown command type: ${(command as any).type}`);
    }
  }

  /**
   * Search commands by query
   */
  searchCommands(query: string): Command[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllCommands().filter(cmd =>
      cmd.name.toLowerCase().includes(lowercaseQuery) ||
      cmd.description.toLowerCase().includes(lowercaseQuery) ||
      cmd.aliases?.some(alias => alias.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Remove a command
   */
  removeCommand(id: string): void {
    this.commands.delete(id);
  }

  /**
   * Get command statistics
   */
  getStats() {
    const commands = this.getAllCommands();
    return {
      total: commands.length,
      byType: {
        slash: commands.filter(c => c.type === 'slash').length,
        tool: commands.filter(c => c.type === 'tool').length,
        skill: commands.filter(c => c.type === 'skill').length,
        mcp: commands.filter(c => c.type === 'mcp').length,
      },
      byCategory: commands.reduce((acc, cmd) => {
        const cat = cmd.category || 'uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

// Singleton instance
export const commandService = new CommandService();

// Legacy exports for compatibility
export const slashCommandsManager = {
  getAllCommands: () => commandService.getCommandsByType('slash'),
  getAll: () => commandService.getCommandsByType('slash'),
};

export const skillFilesManager = {
  getAllSkills: () => commandService.getCommandsByType('skill'),
  getAll: () => commandService.getCommandsByType('skill'),
};

export const mcpServersManager = {
  getAllServers: () => commandService.getCommandsByType('mcp'),
  getServers: () => commandService.getCommandsByType('mcp'),
};
