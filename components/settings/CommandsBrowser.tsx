import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Sparkles, Search } from 'lucide-react';
import { cn } from '../../design-system/utils';
import { slashCommandsManager } from '../../services/slashCommands';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';

interface CommandsBrowserProps {
  className?: string;
}

const CommandsBrowser: React.FC<CommandsBrowserProps> = ({ className }) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const commands = useMemo(() => {
    return slashCommandsManager.getAllCommands();
  }, []);

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return commands;

    const query = searchQuery.toLowerCase();
    return commands.filter(cmd =>
      cmd.name.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query) ||
      (cmd.aliases || []).some(alias => alias.toLowerCase().includes(query))
    );
  }, [commands, searchQuery]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Terminal className="w-6 h-6 text-primary-400" />
          Slash Commands
        </h2>
        <p className="text-neutral-400 text-sm">
          Quick actions and utilities via command palette (⌘K)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card variant="glass" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-400">{commands.length}</div>
            <div className="text-xs text-neutral-400 mt-1">Total Commands</div>
          </div>
        </Card>
        <Card variant="glass" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {commands.reduce((acc, cmd) => acc + (cmd.aliases?.length || 0), 0)}
            </div>
            <div className="text-xs text-neutral-400 mt-1">Aliases</div>
          </div>
        </Card>
        <Card variant="glass" padding="md">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">⌘K</div>
            <div className="text-xs text-neutral-400 mt-1">Quick Access</div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="Search commands..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {/* Commands List */}
      <div className="space-y-3">
        {filteredCommands.length > 0 ? (
          filteredCommands.map((command) => (
            <motion.div
              key={command.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              layout
            >
              <Card variant="glass" padding="md" interactive>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Terminal className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-base font-semibold text-white">
                        /{command.name}
                      </code>
                      {command.aliases && command.aliases.length > 0 && (
                        <div className="flex items-center gap-1">
                          {command.aliases.map(alias => (
                            <Badge key={alias} variant="secondary" size="sm">
                              /{alias}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-neutral-400 mb-3">
                      {command.description}
                    </p>

                    {command.parameters && command.parameters.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-neutral-500 uppercase">
                          Parameters
                        </div>
                        {command.parameters.map(param => (
                          <div key={param.name} className="flex items-center gap-2 text-xs">
                            <code className="text-primary-400">{param.name}</code>
                            <Badge variant="secondary" size="sm">
                              {param.type}
                            </Badge>
                            {param.required && (
                              <Badge variant="error" size="sm">
                                required
                              </Badge>
                            )}
                            {param.description && (
                              <span className="text-neutral-500">
                                — {param.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card variant="glass" padding="lg">
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-1">
                No commands found
              </h3>
              <p className="text-sm text-neutral-400">
                Try a different search term
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Usage Tip */}
      <Card variant="glass" padding="md">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-white mb-1">
              Quick Access Tip
            </div>
            <p className="text-neutral-400">
              Press <kbd className="px-2 py-1 bg-white/10 rounded text-xs">⌘K</kbd> or{' '}
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl+K</kbd> to
              open the command palette and quickly execute any command.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CommandsBrowser;
