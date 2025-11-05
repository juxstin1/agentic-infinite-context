/**
 * Model Context Protocol (MCP) Servers Integration
 * Provides tools and resources from external MCP servers
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transport: 'stdio' | 'sse';
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  tools: MCPTool[];
  resources: MCPResource[];
  lastError?: string;
}

export class MCPServerManager {
  private servers: Map<string, MCPServer> = new Map();
  private connections: Map<string, any> = new Map();

  /**
   * Register an MCP server
   */
  async registerServer(config: {
    id: string;
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    transport?: 'stdio' | 'sse';
  }): Promise<MCPServer> {
    const server: MCPServer = {
      ...config,
      transport: config.transport || 'stdio',
      status: 'disconnected',
      tools: [],
      resources: [],
    };

    this.servers.set(server.id, server);
    return server;
  }

  /**
   * Connect to an MCP server
   */
  async connectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);

    try {
      server.status = 'connecting';
      this.servers.set(serverId, server);

      // Note: Actual MCP connection would require native process spawning
      // This is a simplified implementation for the browser context
      // In production, this would use the MCP SDK

      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock tools and resources
      server.tools = this.getMockTools(serverId);
      server.resources = this.getMockResources(serverId);
      server.status = 'connected';

      this.servers.set(serverId, server);
      console.log(`✅ Connected to MCP server: ${server.name}`);
    } catch (error) {
      server.status = 'error';
      server.lastError = error instanceof Error ? error.message : 'Connection failed';
      this.servers.set(serverId, server);
      throw error;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    const connection = this.connections.get(serverId);
    if (connection) {
      // Close connection
      this.connections.delete(serverId);
    }

    server.status = 'disconnected';
    server.tools = [];
    server.resources = [];
    this.servers.set(serverId, server);
  }

  /**
   * Call a tool from an MCP server
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);
    if (server.status !== 'connected') throw new Error(`Server ${serverId} not connected`);

    const tool = server.tools.find(t => t.name === toolName);
    if (!tool) throw new Error(`Tool ${toolName} not found on server ${serverId}`);

    try {
      // In production, this would call the actual MCP server
      // For now, return mock response
      return {
        result: `Mock result from ${toolName}`,
        args,
      };
    } catch (error) {
      throw new Error(
        `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(serverId: string, uri: string): Promise<string> {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);
    if (server.status !== 'connected') throw new Error(`Server ${serverId} not connected`);

    const resource = server.resources.find(r => r.uri === uri);
    if (!resource) throw new Error(`Resource ${uri} not found on server ${serverId}`);

    try {
      // In production, this would read from the actual MCP server
      return `Mock content from resource: ${resource.name}`;
    } catch (error) {
      throw new Error(
        `Resource read failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all registered servers
   */
  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  getAllServers(): MCPServer[] {
    return this.getServers();
  }

  /**
   * Get a specific server
   */
  getServer(serverId: string): MCPServer | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): Array<MCPTool & { serverId: string; serverName: string }> {
    const tools: Array<MCPTool & { serverId: string; serverName: string }> = [];

    this.servers.forEach(server => {
      if (server.status === 'connected') {
        server.tools.forEach(tool => {
          tools.push({
            ...tool,
            serverId: server.id,
            serverName: server.name,
          });
        });
      }
    });

    return tools;
  }

  /**
   * Get all resources from all connected servers
   */
  getAllResources(): Array<MCPResource & { serverId: string; serverName: string }> {
    const resources: Array<MCPResource & { serverId: string; serverName: string }> = [];

    this.servers.forEach(server => {
      if (server.status === 'connected') {
        server.resources.forEach(resource => {
          resources.push({
            ...resource,
            serverId: server.id,
            serverName: server.name,
          });
        });
      }
    });

    return resources;
  }

  /**
   * Unregister an MCP server
   */
  async unregisterServer(serverId: string): Promise<void> {
    await this.disconnectServer(serverId);
    this.servers.delete(serverId);
  }

  /**
   * Mock tools for demonstration (replace with actual MCP tools)
   */
  private getMockTools(serverId: string): MCPTool[] {
    const toolSets: Record<string, MCPTool[]> = {
      filesystem: [
        {
          name: 'read_file',
          description: 'Read contents of a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' },
            },
            required: ['path'],
          },
        },
        {
          name: 'write_file',
          description: 'Write content to a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' },
              content: { type: 'string', description: 'File content' },
            },
            required: ['path', 'content'],
          },
        },
      ],
      browser: [
        {
          name: 'fetch_url',
          description: 'Fetch content from a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to fetch' },
            },
            required: ['url'],
          },
        },
      ],
    };

    return toolSets[serverId] || [];
  }

  /**
   * Mock resources for demonstration (replace with actual MCP resources)
   */
  private getMockResources(serverId: string): MCPResource[] {
    const resourceSets: Record<string, MCPResource[]> = {
      filesystem: [
        {
          uri: 'file:///home/user/documents',
          name: 'Documents',
          description: 'User documents folder',
          mimeType: 'inode/directory',
        },
      ],
      browser: [
        {
          uri: 'browser://bookmarks',
          name: 'Bookmarks',
          description: 'Browser bookmarks',
          mimeType: 'application/json',
        },
      ],
    };

    return resourceSets[serverId] || [];
  }
}

export const mcpServerManager = new MCPServerManager();
export const mcpServersManager = mcpServerManager; // Alias for consistency
