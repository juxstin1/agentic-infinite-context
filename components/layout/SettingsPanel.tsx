import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Zap, Terminal, Wrench } from 'lucide-react';
import { cn } from '../../design-system/utils';
import SystemPromptsEditor from '../settings/SystemPromptsEditor';
import SkillsManager from '../settings/SkillsManager';
import ToolsManager from '../settings/ToolsManager';
import CommandsBrowser from '../settings/CommandsBrowser';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: 'prompts' | 'skills' | 'tools' | 'commands' | 'settings';
}

type SettingsSection = 'prompts' | 'skills' | 'tools' | 'commands' | 'settings';

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  initialSection = 'prompts',
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  const sections = [
    {
      id: 'prompts' as const,
      label: 'System Prompts',
      icon: Settings,
      description: 'Customize AI behavior',
    },
    {
      id: 'skills' as const,
      label: 'Skills',
      icon: Zap,
      description: 'Manage agent behaviors',
    },
    {
      id: 'commands' as const,
      label: 'Slash Commands',
      icon: Terminal,
      description: 'Quick actions',
    },
    {
      id: 'tools' as const,
      label: 'Tools & MCP',
      icon: Wrench,
      description: 'External integrations',
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Settings Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed right-0 top-0 h-full w-full max-w-5xl bg-neutral-950 border-l border-white/10 z-50 overflow-hidden"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl">
            <div>
              <h2 className="text-xl font-bold text-white">Settings & Management</h2>
              <p className="text-sm text-neutral-400">
                Configure your AI assistant
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-64 border-r border-white/10 bg-white/5 p-4 overflow-y-auto">
              <div className="space-y-2">
                {sections.map(section => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <motion.button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl',
                        'transition-all duration-200 text-left',
                        'group relative',
                        isActive
                          ? 'bg-primary-500/20 text-primary-300'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                      )}
                      whileHover={{ x: isActive ? 0 : 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon
                        className={cn(
                          'w-5 h-5 flex-shrink-0',
                          isActive && 'text-primary-400'
                        )}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{section.label}</div>
                        <div className="text-xs text-neutral-500">
                          {section.description}
                        </div>
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSettingsSection"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeSection === 'prompts' && (
                    <motion.div
                      key="prompts"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <SystemPromptsEditor />
                    </motion.div>
                  )}

                  {activeSection === 'skills' && (
                    <motion.div
                      key="skills"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <SkillsManager />
                    </motion.div>
                  )}

                  {activeSection === 'commands' && (
                    <motion.div
                      key="commands"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <CommandsBrowser />
                    </motion.div>
                  )}

                  {activeSection === 'tools' && (
                    <motion.div
                      key="tools"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <ToolsManager />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default SettingsPanel;
