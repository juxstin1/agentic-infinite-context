import { ToolExecutor, ToolResult, ToolMemory } from '../types';
import crypto from 'crypto-js';

/**
 * Built-in tool executors that agents can use
 */
export const builtinTools: Record<string, ToolExecutor> = {
  echo: {
    name: 'echo',
    description: 'Echo back a message (test tool)',
    execute: async (args: Record<string, any>): Promise<ToolResult> => {
      const message = args.message || args.text || '';
      return {
        success: true,
        output: `Echo: ${message}`,
      };
    },
    validate: (args) => Boolean(args.message || args.text),
  },

  calculate: {
    name: 'calculate',
    description: 'Perform mathematical calculations',
    execute: async (args: Record<string, any>): Promise<ToolResult> => {
      try {
        const expression = args.expression || args.expr || '';

        // Safe eval using Function constructor (only allows math operations)
        const safeEval = (expr: string): number => {
          // Remove anything that's not a number, operator, or parenthesis
          const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, '');
          if (sanitized !== expr) {
            throw new Error('Invalid characters in expression');
          }
          return Function(`"use strict"; return (${sanitized})`)();
        };

        const result = safeEval(expression);

        return {
          success: true,
          output: `${expression} = ${result}`,
          metadata: { result },
        };
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Calculation failed',
        };
      }
    },
    validate: (args) => Boolean(args.expression || args.expr),
  },

  search_memory: {
    name: 'search_memory',
    description: 'Search through memory facts',
    execute: async (args: Record<string, any>): Promise<ToolResult> => {
      // This will be implemented by the RecursiveLearningEngine
      return {
        success: false,
        output: '',
        error: 'search_memory must be implemented by RecursiveLearningEngine',
      };
    },
    validate: (args) => Boolean(args.query),
  },

  create_reminder: {
    name: 'create_reminder',
    description: 'Create a reminder or todo item',
    execute: async (args: Record<string, any>): Promise<ToolResult> => {
      const task = args.task || args.reminder || '';
      const when = args.when || 'unspecified';

      return {
        success: true,
        output: `Reminder created: "${task}" (${when})`,
        metadata: { task, when },
      };
    },
    validate: (args) => Boolean(args.task || args.reminder),
  },

  web_search: {
    name: 'web_search',
    description: 'Search the web (placeholder for future implementation)',
    execute: async (args: Record<string, any>): Promise<ToolResult> => {
      return {
        success: false,
        output: '',
        error: 'Web search not yet implemented - this is a local-only system',
      };
    },
    validate: (args) => Boolean(args.query),
  },
};

/**
 * ToolExecutionEngine manages tool execution and learns from results
 * PHASE 2: Supports tool chaining
 */
export class ToolExecutionEngine {
  private tools: Map<string, ToolExecutor>;
  private toolMemories: Map<string, ToolMemory>;
  private executionDepth: number = 0;
  private maxChainDepth: number = 3; // Prevent infinite loops

  constructor() {
    this.tools = new Map(Object.entries(builtinTools));
    this.toolMemories = new Map();
  }

  /**
   * Register a custom tool
   */
  registerTool(tool: ToolExecutor): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Execute a tool and learn from the result
   * PHASE 2: Supports tool chaining with depth limiting
   */
  async executeTool(
    toolName: string,
    args: Record<string, any>,
    context: string = ''
  ): Promise<ToolResult> {
    // Prevent infinite recursion
    if (this.executionDepth >= this.maxChainDepth) {
      return {
        success: false,
        output: '',
        error: `Tool chain depth limit reached (max ${this.maxChainDepth})`,
      };
    }

    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        output: '',
        error: `Tool "${toolName}" not found`,
      };
    }

    // PHASE 2: Pre-process args to resolve tool calls
    const resolvedArgs = await this.resolveToolChains(args);

    // Validate args if validator exists
    if (tool.validate && !tool.validate(resolvedArgs)) {
      return {
        success: false,
        output: '',
        error: `Invalid arguments for tool "${toolName}"`,
      };
    }

    try {
      this.executionDepth++;
      const result = await tool.execute(resolvedArgs);
      this.executionDepth--;

      // Learn from execution
      this.recordToolExecution(toolName, context, resolvedArgs, result);

      return result;
    } catch (error) {
      this.executionDepth--;
      const errorResult: ToolResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Learn from failure too
      this.recordToolExecution(toolName, context, resolvedArgs, errorResult);

      return errorResult;
    }
  }

  /**
   * PHASE 2: Resolve nested tool calls in arguments
   * Example: { expression: "10 + $calculate(2*5)" } → { expression: "10 + 10" }
   */
  private async resolveToolChains(args: Record<string, any>): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string') {
        // Check for tool call pattern: $toolname(arg1, arg2, ...)
        const toolCallPattern = /\$(\w+)\(([^)]*)\)/g;
        let resolvedValue = value;
        let match;

        while ((match = toolCallPattern.exec(value)) !== null) {
          const [fullMatch, nestedToolName, argsString] = match;

          // Parse nested tool args (simple comma-separated for now)
          const nestedArgs: Record<string, any> = {};
          const argParts = argsString.split(',').map(s => s.trim());

          if (nestedToolName === 'calculate') {
            nestedArgs.expression = argsString;
          } else if (nestedToolName === 'search_memory') {
            nestedArgs.query = argsString;
          } else {
            // Generic: first arg is the main input
            nestedArgs.input = argsString;
          }

          // Execute nested tool
          const nestedResult = await this.executeTool(nestedToolName, nestedArgs, 'chained');

          // Replace the tool call with its result
          if (nestedResult.success) {
            const replacement = nestedResult.metadata?.result?.toString() || nestedResult.output;
            resolvedValue = resolvedValue.replace(fullMatch, replacement);
          } else {
            // If nested tool fails, keep the original placeholder
            resolvedValue = resolvedValue.replace(fullMatch, `[Error: ${nestedResult.error}]`);
          }
        }

        resolved[key] = resolvedValue;
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Record tool execution for learning
   */
  private recordToolExecution(
    toolName: string,
    context: string,
    args: Record<string, any>,
    result: ToolResult
  ): void {
    const memory = this.toolMemories.get(toolName) || {
      id: crypto.lib.WordArray.random(16).toString(),
      tool_name: toolName,
      context_pattern: '',
      success_count: 0,
      failure_count: 0,
      total_executions: 0,
      common_args: {},
      failure_modes: [],
      last_used: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    memory.total_executions += 1;
    memory.last_used = new Date().toISOString();

    if (result.success) {
      memory.success_count += 1;
    } else {
      memory.failure_count += 1;
      if (result.error && !memory.failure_modes.includes(result.error)) {
        memory.failure_modes.push(result.error);
      }
    }

    // Learn common argument patterns
    Object.keys(args).forEach(key => {
      if (!memory.common_args[key]) {
        memory.common_args[key] = [];
      }
      const values = memory.common_args[key] as any[];
      const value = args[key];
      if (!values.includes(value) && values.length < 10) {
        values.push(value);
      }
    });

    // Update context pattern (simple for now, could use clustering later)
    if (context && memory.total_executions <= 10) {
      memory.context_pattern += (memory.context_pattern ? ' | ' : '') + context.slice(0, 50);
    }

    this.toolMemories.set(toolName, memory);
  }

  /**
   * Get tool memory for learning insights
   */
  getToolMemory(toolName: string): ToolMemory | undefined {
    return this.toolMemories.get(toolName);
  }

  /**
   * Get all tool memories
   */
  getAllToolMemories(): ToolMemory[] {
    return Array.from(this.toolMemories.values());
  }

  /**
   * Load tool memories from storage
   */
  loadToolMemories(memories: ToolMemory[]): void {
    memories.forEach(memory => {
      this.toolMemories.set(memory.tool_name, memory);
    });
  }

  /**
   * Get list of available tools
   */
  getAvailableTools(): ToolExecutor[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool by name
   */
  getTool(name: string): ToolExecutor | undefined {
    return this.tools.get(name);
  }

  /**
   * Recommend tools based on context
   */
  recommendTools(context: string, limit: number = 3): string[] {
    const scored = Array.from(this.toolMemories.entries())
      .map(([name, memory]) => {
        let score = 0;

        // Success rate scoring
        const successRate = memory.total_executions > 0
          ? memory.success_count / memory.total_executions
          : 0.5;
        score += successRate * 0.5;

        // Usage frequency scoring
        score += Math.min(memory.total_executions * 0.01, 0.3);

        // Context similarity (basic keyword matching)
        const contextLower = context.toLowerCase();
        const patternLower = memory.context_pattern.toLowerCase();
        const commonWords = contextLower.split(/\s+/).filter(word =>
          word.length > 3 && patternLower.includes(word)
        ).length;
        score += Math.min(commonWords * 0.1, 0.2);

        return { name, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.name);

    return scored;
  }
}
