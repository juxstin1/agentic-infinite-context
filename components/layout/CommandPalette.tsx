import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Terminal,
  Zap,
  Layers,
  FileText,
  ArrowRight,
  Clock,
  Star,
} from 'lucide-react';
import { cn } from '../../design-system/utils';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { commandService } from '../../services/CommandService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand?: (command: string, args?: any) => void;
}

interface CommandItem {
  id: string;
  type: 'command' | 'skill' | 'workspace' | 'action';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  keywords: string[];
  action: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { workspaces, switchWorkspace, activeWorkspace } = useWorkspace();

  // Build command items
  const allItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Add slash commands
    const commands = commandService.getCommandsByType('slash');
    commands.forEach(cmd => {
      items.push({
        id: `cmd-${cmd.name}`,
        type: 'command',
        title: `/${cmd.name}`,
        subtitle: cmd.description,
        icon: <Terminal className="w-4 h-4 text-blue-400" />,
        keywords: [cmd.name, ...(cmd.aliases || []), ...(cmd.description?.split(' ') || [])],
        action: () => {
          onExecuteCommand?.(`/${cmd.name}`);
          addToRecent(`/${cmd.name}`);
          onClose();
        },
      });
    });

    // Add skills
    const skills = commandService.getCommandsByType('skill');
    skills.forEach(skill => {
      const skillKeywords = (skill as any).keywords || [];
      items.push({
        id: `skill-${skill.id}`,
        type: 'skill',
        title: skill.name,
        subtitle: skill.description,
        icon: <Zap className="w-4 h-4 text-purple-400" />,
        keywords: [skill.name, ...skillKeywords, skill.category || ''],
        action: () => {
          onExecuteCommand?.(`Use ${skill.name} skill`);
          addToRecent(skill.name);
          onClose();
        },
      });
    });

    // Add workspaces
    workspaces.forEach(workspace => {
      items.push({
        id: `workspace-${workspace.id}`,
        type: 'workspace',
        title: workspace.name,
        subtitle: 'Switch to workspace',
        icon: <Layers className="w-4 h-4 text-green-400" />,
        keywords: [workspace.name, 'workspace', 'switch'],
        action: () => {
          switchWorkspace(workspace.id);
          addToRecent(`Workspace: ${workspace.name}`);
          onClose();
        },
      });
    });

    // Add quick actions
    const quickActions: CommandItem[] = [
      {
        id: 'action-new-chat',
        type: 'action',
        title: 'New Chat',
        subtitle: 'Start a fresh conversation',
        icon: <FileText className="w-4 h-4 text-amber-400" />,
        keywords: ['new', 'chat', 'conversation', 'start', 'fresh'],
        action: () => {
          onExecuteCommand?.('/clear');
          onClose();
        },
      },
      {
        id: 'action-export',
        type: 'action',
        title: 'Export Conversation',
        subtitle: 'Download chat as markdown',
        icon: <FileText className="w-4 h-4 text-amber-400" />,
        keywords: ['export', 'download', 'save', 'markdown'],
        action: () => {
          onExecuteCommand?.('/export');
          onClose();
        },
      },
    ];

    return [...items, ...quickActions];
  }, [workspaces, onExecuteCommand, onClose, switchWorkspace]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 8);

    const lowerQuery = query.toLowerCase();
    return allItems
      .filter(item => {
        const searchText = [
          item.title,
          item.subtitle,
          ...item.keywords,
        ]
          .join(' ')
          .toLowerCase();
        return searchText.includes(lowerQuery);
      })
      .slice(0, 8);
  }, [query, allItems]);

  // Add to recent commands
  const addToRecent = (command: string) => {
    setRecentCommands(prev => {
      const updated = [command, ...prev.filter(c => c !== command)];
      return updated.slice(0, 5);
    });
  };

  // Recent items
  const recentItems = useMemo(() => {
    return recentCommands
      .map(cmd => allItems.find(item => item.title === cmd || item.title.includes(cmd)))
      .filter(Boolean) as CommandItem[];
  }, [recentCommands, allItems]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredItems.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, onClose]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getTypeColor = (type: CommandItem['type']) => {
    switch (type) {
      case 'command':
        return 'text-blue-400 bg-blue-500/10';
      case 'skill':
        return 'text-purple-400 bg-purple-500/10';
      case 'workspace':
        return 'text-green-400 bg-green-500/10';
      case 'action':
        return 'text-amber-400 bg-amber-500/10';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleBackdropClick}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
          >
            <div className="bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search commands, skills, workspaces..."
                  className="flex-1 bg-transparent text-white placeholder-neutral-500 outline-none text-sm"
                />
                <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-neutral-400">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {/* Recent Commands */}
                {!query && recentItems.length > 0 && (
                  <div className="p-2">
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-400">
                      <Clock className="w-3 h-3" />
                      Recent
                    </div>
                    {recentItems.map((item, index) => (
                      <CommandItem
                        key={item.id}
                        item={item}
                        isSelected={false}
                        onClick={item.action}
                        getTypeColor={getTypeColor}
                      />
                    ))}
                  </div>
                )}

                {/* Filtered Results */}
                {filteredItems.length > 0 ? (
                  <div className="p-2">
                    {query && (
                      <div className="px-3 py-2 text-xs font-semibold text-neutral-400">
                        Results ({filteredItems.length})
                      </div>
                    )}
                    {filteredItems.map((item, index) => (
                      <CommandItem
                        key={item.id}
                        item={item}
                        isSelected={index === selectedIndex}
                        onClick={item.action}
                        getTypeColor={getTypeColor}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-neutral-400 text-sm">No results found</p>
                    <p className="text-neutral-500 text-xs mt-1">
                      Try a different search term
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-white/5">
                <div className="flex items-center gap-4 text-xs text-neutral-400">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↵</kbd>
                    Select
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  {filteredItems.length} commands
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Command Item Component
interface CommandItemProps {
  item: CommandItem;
  isSelected: boolean;
  onClick: () => void;
  getTypeColor: (type: CommandItem['type']) => string;
}

const CommandItem: React.FC<CommandItemProps> = ({
  item,
  isSelected,
  onClick,
  getTypeColor,
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
        'transition-colors duration-150 group',
        isSelected
          ? 'bg-primary-500/20 border border-primary-500/30'
          : 'hover:bg-white/5 border border-transparent'
      )}
      whileHover={{ x: 4 }}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          getTypeColor(item.type)
        )}
      >
        {item.icon}
      </div>

      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-white">{item.title}</div>
        {item.subtitle && (
          <div className="text-xs text-neutral-400 mt-0.5">{item.subtitle}</div>
        )}
      </div>

      {isSelected && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowRight className="w-4 h-4 text-primary-400" />
        </motion.div>
      )}
    </motion.button>
  );
};

export default CommandPalette;
