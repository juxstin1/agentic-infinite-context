import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar, { SidebarSection } from './Sidebar';
import CommandPalette from './CommandPalette';
import { cn } from '../../design-system/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  rightPanel?: React.ReactNode;
  showSidebar?: boolean;
  showRightPanel?: boolean;
  onExecuteCommand?: (command: string, args?: any) => void;
  onSidebarNavigate?: (section: SidebarSection) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  sidebar,
  rightPanel,
  showSidebar = true,
  showRightPanel = false,
  onExecuteCommand,
  onSidebarNavigate,
}) => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(showSidebar);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(showRightPanel);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }

      // Cmd/Ctrl + B - Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarVisible(prev => !prev);
      }

      // Cmd/Ctrl + \ - Toggle right panel
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsRightPanelVisible(prev => !prev);
      }

      // Cmd/Ctrl + / - Show keyboard shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        alert(`Keyboard Shortcuts:

⌘K - Command Palette
⌘B - Toggle Sidebar
⌘\\ - Toggle Right Panel
⌘/ - Show Shortcuts
        `);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="bg-app animate-gradient-x text-text-primary w-full h-screen overflow-hidden">
      {/* Background gradient handled by bg-app */}

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Main Layout */}
      <div className="relative h-full flex">
        {/* Left Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarVisible && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex-shrink-0"
            >
              {sidebar || <Sidebar onNavigate={onSidebarNavigate} />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 relative overflow-hidden">
          <div className="h-full w-full relative">
            {/* Content container with fade effect */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="h-full w-full"
            >
              {children}
            </motion.div>

            {/* Floating toolbar indicator */}
            {!isSidebarVisible && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'absolute top-4 left-4 z-10',
                  'w-10 h-10 rounded-xl',
                  'bg-white/5 backdrop-blur-xl border border-white/10',
                  'flex items-center justify-center',
                  'hover:bg-white/10 transition-colors',
                  'group'
                )}
                onClick={() => setIsSidebarVisible(true)}
                title="Show Sidebar (⌘B)"
              >
                <div className="flex flex-col gap-1">
                  <div className="w-4 h-0.5 bg-white/60 group-hover:bg-white transition-colors" />
                  <div className="w-4 h-0.5 bg-white/60 group-hover:bg-white transition-colors" />
                  <div className="w-4 h-0.5 bg-white/60 group-hover:bg-white transition-colors" />
                </div>
              </motion.button>
            )}
          </div>
        </main>

        {/* Right Panel */}
        <AnimatePresence mode="wait">
          {isRightPanelVisible && rightPanel && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-80 flex-shrink-0 border-l border-white/10 bg-white/5 backdrop-blur-xl"
            >
              {rightPanel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onExecuteCommand={onExecuteCommand}
      />

      {/* Floating Action Button - Command Palette Trigger */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsCommandPaletteOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'w-14 h-14 rounded-2xl',
          'bg-gradient-to-br from-primary-500 to-primary-600',
          'border border-primary-400/30',
          'shadow-2xl shadow-primary-500/20',
          'flex items-center justify-center',
          'text-white font-semibold text-xl',
          'hover:shadow-primary-500/40 transition-shadow',
          'group'
        )}
        title="Command Palette (⌘K)"
      >
        <motion.span
          initial={{ rotate: 0 }}
          whileHover={{ rotate: 90 }}
          transition={{ duration: 0.2 }}
        >
          ⌘
        </motion.span>

        {/* Pulse animation */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-primary-500"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.button>

      {/* Keyboard shortcuts hint */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 left-6 z-10"
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-xs text-neutral-400">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 bg-white/10 rounded">⌘K</kbd>
          <span>for commands</span>
        </div>
      </motion.div>
    </div>
  );
};

export default AppLayout;
