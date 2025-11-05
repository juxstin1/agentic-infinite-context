import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Zap,
  Terminal,
  FileText,
  Layers,
  Search,
  Home,
  BookOpen,
} from 'lucide-react';
import { cn } from '../../design-system/utils';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface SidebarProps {
  className?: string;
}

export type SidebarSection =
  | 'home'
  | 'chat'
  | 'workspaces'
  | 'skills'
  | 'commands'
  | 'tools'
  | 'settings';

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<SidebarSection>('chat');
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace } = useWorkspace();

  const sections = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'chat' as const, label: 'Chat', icon: BookOpen },
    { id: 'workspaces' as const, label: 'Workspaces', icon: Layers },
    { id: 'skills' as const, label: 'Skills', icon: Zap, badge: '4' },
    { id: 'commands' as const, label: 'Commands', icon: Terminal, badge: '6' },
    { id: 'tools' as const, label: 'Tools', icon: FileText },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const handleCreateWorkspace = () => {
    const name = prompt('Enter workspace name:');
    if (name) {
      createWorkspace({ name });
    }
  };

  return (
    <motion.aside
      className={cn(
        'relative h-full flex flex-col',
        'bg-white/5 backdrop-blur-xl border-r border-white/10',
        'transition-all duration-300',
        className
      )}
      animate={{ width: isCollapsed ? 64 : 280 }}
      initial={{ width: 280 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Agentic AI</h2>
                <p className="text-xs text-neutral-400">Infinite Context</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex-shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Workspace Selector */}
      {!isCollapsed && activeSection === 'workspaces' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-b border-white/10"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase">
              Workspaces
            </span>
            <Button variant="ghost" size="sm" onClick={handleCreateWorkspace}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {workspaces.map(workspace => (
              <motion.button
                key={workspace.id}
                onClick={() => switchWorkspace(workspace.id)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-left text-sm',
                  'transition-colors duration-200',
                  workspace.id === activeWorkspace?.id
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                    : 'bg-white/5 text-neutral-300 hover:bg-white/10 border border-transparent'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{workspace.name}</span>
                  {workspace.id === activeWorkspace?.id && (
                    <Badge variant="primary" size="sm" dot />
                  )}
                </div>
                {workspace.systemPrompt && (
                  <p className="text-xs text-neutral-400 mt-1 truncate">
                    Custom prompt
                  </p>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {sections.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <motion.button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
                  'transition-all duration-200',
                  'group relative',
                  isActive
                    ? 'bg-primary-500/20 text-primary-300'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                )}
                whileHover={{ x: isCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0',
                    isActive && 'text-primary-400'
                  )}
                />

                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm font-medium flex-1 text-left"
                    >
                      {section.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {!isCollapsed && section.badge && (
                  <Badge variant="secondary" size="sm">
                    {section.badge}
                  </Badge>
                )}

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeSection"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {section.label}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* Footer - Quick Actions */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border-t border-white/10"
        >
          <div className="bg-gradient-to-br from-primary-500/20 to-primary-600/20 border border-primary-500/30 rounded-xl p-3">
            <div className="flex items-start gap-2 mb-2">
              <Search className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-white mb-1">
                  Quick Search
                </h4>
                <p className="text-xs text-neutral-400">
                  Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">⌘K</kbd> to search
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
};

export default Sidebar;
