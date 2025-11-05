import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Loader2,
  Sparkles,
  Zap,
  Bot,
  User as UserIcon,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { cn, spring } from '../../design-system/utils';
import { Message } from '../../types';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { useTheme } from '../../contexts/ThemeContext';

interface EnhancedChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  currentUser: string;
  className?: string;
}

const EnhancedChatWindow: React.FC<EnhancedChatWindowProps> = ({
  messages,
  onSendMessage,
  isLoading = false,
  currentUser,
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { actualTheme } = useTheme();

  // Auto-scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  // Show scroll button when not at bottom
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // Handle message send
  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Chat Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                size="md"
                fallback="AI"
                status="online"
                className="ring-2 ring-primary-500/20"
              />
              <motion.div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Sparkles className="w-3 h-3 text-white" />
              </motion.div>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Agentic AI Assistant
              </h2>
              <p className="text-xs text-neutral-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success-light animate-pulse" />
                Online & Learning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="primary" size="sm" dot>
              {messages.length} messages
            </Badge>
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
      >
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex items-center justify-center"
          >
            <div className="text-center max-w-md">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">
                Start a Conversation
              </h3>
              <p className="text-neutral-400 text-sm mb-4">
                Ask me anything or use{' '}
                <kbd className="px-2 py-1 bg-white/10 rounded text-xs">⌘K</kbd> for
                commands
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="secondary" size="sm">
                  Coding
                </Badge>
                <Badge variant="secondary" size="sm">
                  Analysis
                </Badge>
                <Badge variant="secondary" size="sm">
                  Research
                </Badge>
                <Badge variant="secondary" size="sm">
                  Writing
                </Badge>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isCurrentUser={message.sender_id === currentUser}
              showAvatar={
                index === 0 ||
                messages[index - 1].sender_id !== message.sender_id
              }
            />
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3"
          >
            <Avatar size="sm" fallback="AI" className="flex-shrink-0" />
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
              <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
              <span className="text-sm text-neutral-400">Thinking...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-32 right-8 w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 transition-colors shadow-lg flex items-center justify-center"
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-6 py-4 border-t border-white/10 bg-white/5 backdrop-blur-xl"
      >
        <div className="max-w-4xl mx-auto">
          <div
            className={cn(
              'relative rounded-2xl',
              'bg-white/5 backdrop-blur-xl border border-white/10',
              'focus-within:border-primary-500/50 focus-within:ring-2 focus-within:ring-primary-500/20',
              'transition-all duration-200'
            )}
          >
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="Type a message... (Shift+Enter for new line)"
              className="w-full px-4 py-3 bg-transparent text-white placeholder-neutral-500 outline-none resize-none max-h-[200px]"
              rows={1}
              disabled={isLoading}
            />

            <div className="flex items-center justify-between px-4 py-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>Use</span>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded">⌘K</kbd>
                <span>for commands</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                isLoading={isLoading}
              >
                <Send className="w-4 h-4" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Chat Message Component
interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isCurrentUser,
  showAvatar,
}) => {
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={spring}
        className="flex justify-center"
      >
        <div className="max-w-2xl px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <p className="text-sm text-amber-200/90">{message.content}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={spring}
      layout
      className={cn(
        'flex gap-3',
        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      {showAvatar ? (
        <Avatar
          size="sm"
          fallback={isCurrentUser ? 'You' : 'AI'}
          className="flex-shrink-0"
        />
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      {/* Message bubble */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className={cn(
          'group relative max-w-2xl',
          isCurrentUser ? 'ml-auto' : 'mr-auto'
        )}
      >
        <div
          className={cn(
            'px-4 py-3 rounded-2xl backdrop-blur-xl',
            isCurrentUser
              ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
              : 'bg-white/10 border border-white/10 text-white'
          )}
        >
          {/* Message content */}
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Message metadata */}
          <div
            className={cn(
              'flex items-center gap-2 mt-2 text-xs',
              isCurrentUser ? 'text-white/70' : 'text-neutral-500'
            )}
          >
            <span>{message.senderName}</span>
            <span>•</span>
            <span>
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Hover actions */}
        <div
          className={cn(
            'absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity',
            isCurrentUser ? 'right-0' : 'left-0'
          )}
        >
          <div className="flex items-center gap-1 px-2 py-1 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-lg">
            <button
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Copy"
            >
              📋
            </button>
            <button
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="React"
            >
              👍
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedChatWindow;
