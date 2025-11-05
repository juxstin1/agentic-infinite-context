import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Plus,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Server,
  CheckCircle,
  XCircle,
  AlertCircle,
  Terminal,
  FileText,
} from 'lucide-react';
import { cn } from '../../design-system/utils';
import { mcpServersManager, MCPServer, MCPTool, MCPResource } from '../../services/mcpServers';
import Button from '../ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';

interface ToolsManagerProps {
  className?: string;
}

const ToolsManager: React.FC<ToolsManagerProps> = ({ className }) => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [isAddingServer, setIsAddingServer] = useState(false);

  // Load servers
  useEffect(() => {
    refreshServers();
  }, []);

  const refreshServers = () => {
    setServers(mcpServersManager.getAllServers());
  };

  const getStatusColor = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'error':
        return 'error';
      case 'disconnected':
        return 'secondary';
    }
  };

  const getStatusIcon = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4" />;
      case 'connecting':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'disconnected':
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleAddServer = (name: string, command: string) => {
    const server = mcpServersManager.addServer({ name, command });
    refreshServers();
    setSelectedServer(server);
    setIsAddingServer(false);
  };

  const handleConnectServer = async (serverId: string) => {
    try {
      await mcpServersManager.connectServer(serverId);
      refreshServers();
    } catch (error) {
      console.error('Failed to connect server:', error);
      alert('Failed to connect to server');
    }
  };

  const handleDisconnectServer = async (serverId: string) => {
    try {
      await mcpServersManager.disconnectServer(serverId);
      refreshServers();
    } catch (error) {
      console.error('Failed to disconnect server:', error);
    }
  };

  const handleDeleteServer = (serverId: string) => {
    if (confirm('Delete this MCP server? This cannot be undone.')) {
      mcpServersManager.removeServer(serverId);
      refreshServers();
      if (selectedServer?.id === serverId) {
        setSelectedServer(null);
      }
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary-400" />
            Tools & MCP Servers
          </h2>
          <p className="text-neutral-400 text-sm">
            Manage Model Context Protocol servers and external tools
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddingServer(true)}
        >
          <Plus className="w-4 h-4" />
          Add Server
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card variant="glass" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-400">
              {servers.length}
            </div>
            <div className="text-xs text-neutral-400 mt-1">Total Servers</div>
          </div>
        </Card>
        <Card variant="glass" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-success-light">
              {servers.filter(s => s.status === 'connected').length}
            </div>
            <div className="text-xs text-neutral-400 mt-1">Connected</div>
          </div>
        </Card>
        <Card variant="glass" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {servers.reduce((acc, s) => acc + s.tools.length, 0)}
            </div>
            <div className="text-xs text-neutral-400 mt-1">Tools</div>
          </div>
        </Card>
        <Card variant="glass" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {servers.reduce((acc, s) => acc + s.resources.length, 0)}
            </div>
            <div className="text-xs text-neutral-400 mt-1">Resources</div>
          </div>
        </Card>
      </div>

      {/* Server List */}
      <div className="space-y-3">
        {servers.map(server => (
          <motion.div
            key={server.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              variant="glass"
              padding="md"
              interactive
              glow={selectedServer?.id === server.id}
              onClick={() => setSelectedServer(server)}
              className={cn(
                'cursor-pointer',
                selectedServer?.id === server.id &&
                  'border-primary-500/50 bg-primary-500/5'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                    <Server className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-white">
                        {server.name}
                      </h3>
                      <Badge
                        variant={getStatusColor(server.status)}
                        size="sm"
                        dot
                        pulse={server.status === 'connecting'}
                      >
                        {server.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-400 font-mono">
                      {server.command}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Terminal className="w-3 h-3" />
                        {server.tools.length} tools
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {server.resources.length} resources
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {server.status === 'disconnected' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        handleConnectServer(server.id);
                      }}
                      title="Connect"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        handleDisconnectServer(server.id);
                      }}
                      title="Disconnect"
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteServer(server.id);
                    }}
                    title="Delete"
                    className="text-error-light hover:text-error-DEFAULT"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {servers.length === 0 && (
        <Card variant="glass" padding="lg">
          <div className="text-center py-8">
            <Wrench className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">
              No MCP servers configured
            </h3>
            <p className="text-sm text-neutral-400 mb-4">
              Add your first Model Context Protocol server to extend AI capabilities
            </p>
            <Button variant="primary" onClick={() => setIsAddingServer(true)}>
              <Plus className="w-4 h-4" />
              Add Server
            </Button>
          </div>
        </Card>
      )}

      {/* Server Details Modal */}
      <AnimatePresence>
        {selectedServer && !isAddingServer && (
          <ServerDetailModal
            server={selectedServer}
            onClose={() => setSelectedServer(null)}
            onConnect={() => handleConnectServer(selectedServer.id)}
            onDisconnect={() => handleDisconnectServer(selectedServer.id)}
            onDelete={() => handleDeleteServer(selectedServer.id)}
          />
        )}
      </AnimatePresence>

      {/* Add Server Modal */}
      <AnimatePresence>
        {isAddingServer && (
          <AddServerModal
            onClose={() => setIsAddingServer(false)}
            onAdd={handleAddServer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Server Detail Modal
interface ServerDetailModalProps {
  server: MCPServer;
  onClose: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
}

const ServerDetailModal: React.FC<ServerDetailModalProps> = ({
  server,
  onClose,
  onConnect,
  onDisconnect,
  onDelete,
}) => {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl z-50 max-h-[80vh] overflow-y-auto"
      >
        <Card variant="elevated" padding="lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{server.name}</h2>
              <p className="text-sm text-neutral-400 font-mono">{server.command}</p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Tools */}
            {server.tools.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Tools ({server.tools.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {server.tools.map(tool => (
                    <div
                      key={tool.name}
                      className="bg-white/5 rounded-lg p-3 border border-white/10"
                    >
                      <div className="font-medium text-white text-sm mb-1">
                        {tool.name}
                      </div>
                      <p className="text-xs text-neutral-400">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {server.resources.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Resources ({server.resources.length})
                </h3>
                <div className="space-y-2">
                  {server.resources.map(resource => (
                    <div
                      key={resource.uri}
                      className="bg-white/5 rounded-lg p-3 border border-white/10"
                    >
                      <div className="font-medium text-white text-sm mb-1">
                        {resource.name}
                      </div>
                      <p className="text-xs text-neutral-400 mb-1">
                        {resource.description}
                      </p>
                      <code className="text-xs text-primary-400 font-mono">
                        {resource.uri}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {server.tools.length === 0 && server.resources.length === 0 && (
              <div className="text-center py-6 text-neutral-400 text-sm">
                No tools or resources available. Connect to the server to discover.
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
              {server.status === 'disconnected' ? (
                <Button variant="primary" onClick={onConnect}>
                  <Play className="w-4 h-4" />
                  Connect
                </Button>
              ) : (
                <Button variant="ghost" onClick={onDisconnect}>
                  <Square className="w-4 h-4" />
                  Disconnect
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={onDelete}
                className="text-error-light hover:text-error-DEFAULT"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </>
  );
};

// Add Server Modal
interface AddServerModalProps {
  onClose: () => void;
  onAdd: (name: string, command: string) => void;
}

const AddServerModal: React.FC<AddServerModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && command.trim()) {
      onAdd(name.trim(), command.trim());
    }
  };

  const presets = [
    { name: 'Filesystem', command: 'npx -y @modelcontextprotocol/server-filesystem' },
    { name: 'Git', command: 'npx -y @modelcontextprotocol/server-git' },
    { name: 'GitHub', command: 'npx -y @modelcontextprotocol/server-github' },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
      >
        <Card variant="elevated" padding="lg">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Add MCP Server</h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Server Name
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Filesystem"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Command
              </label>
              <Input
                value={command}
                onChange={e => setCommand(e.target.value)}
                placeholder="e.g., npx -y @modelcontextprotocol/server-filesystem"
                required
              />
            </div>

            {/* Presets */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Quick Presets
              </label>
              <div className="grid grid-cols-3 gap-2">
                {presets.map(preset => (
                  <Button
                    key={preset.name}
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setName(preset.name);
                      setCommand(preset.command);
                    }}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
              <Button variant="ghost" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <Plus className="w-4 h-4" />
                Add Server
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </>
  );
};

export default ToolsManager;
