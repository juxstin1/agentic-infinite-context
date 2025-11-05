import React, { useState } from 'react';
import { Message, Role, User, ToolCall } from '../types';
import { WrenchIcon } from './Icons';
import { ASSISTANT_USER } from '../constants';

interface MessageProps {
  message: Message;
  currentUserId: string;
  participants: User[];
  onExecuteTool?: (toolCall: ToolCall, messageId: string) => Promise<void>;
  onFeedback?: (messageId: string, thumbsUp: boolean) => void;
}

const Avatar: React.FC<{ senderId: string; participants: User[] }> = ({ senderId, participants }) => {
  const user = participants.find(p => p.id === senderId);
  if (!user) {
    return <div className={`w-8 h-8 rounded-full ${ASSISTANT_USER.color} flex-shrink-0`}></div>;
  }
  return (
    <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
      {user.initials}
    </div>
  );
};

const ToolMessage: React.FC<{
  message: Message;
  onExecute?: (toolCall: ToolCall, messageId: string) => Promise<void>;
}> = ({ message, onExecute }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isExecuted, setIsExecuted] = useState(false);

  if (!message.toolCall) return null;

  const handleExecute = async () => {
    if (!onExecute || isExecuting || isExecuted) return;
    setIsExecuting(true);
    try {
      await onExecute(message.toolCall!, message.id);
      setIsExecuted(true);
    } catch (error) {
      console.error('Tool execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex items-start gap-4">
      <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
        <WrenchIcon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-amber-400">Tool Call Proposed</p>
        <div className="mt-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
            <code>
{`{
  "name": "${message.toolCall.name}",
  "args": ${JSON.stringify(message.toolCall.args, null, 2)}
}`}
            </code>
          </pre>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleExecute}
            disabled={isExecuting || isExecuted}
            className={`px-3 py-1 text-xs rounded text-white transition-colors ${
              isExecuted
                ? 'bg-gray-600 cursor-not-allowed'
                : isExecuting
                ? 'bg-green-700 cursor-wait'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isExecuted ? 'Executed' : isExecuting ? 'Executing...' : 'Execute'}
          </button>
          <button
            className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-700 rounded text-white transition-colors"
            disabled={isExecuting}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

const SystemMessage: React.FC<{ message: Message }> = ({ message }) => {
  return (
    <div className="flex justify-center my-4">
      <div className="max-w-2xl px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
          <p className="text-sm text-amber-200/90">{message.content}</p>
        </div>
      </div>
    </div>
  );
};

const MessageComponent: React.FC<MessageProps> = ({
  message,
  currentUserId,
  participants,
  onExecuteTool,
  onFeedback,
}) => {
  const isCurrentUser = message.senderId === currentUserId;
  const isAssistant = message.senderId === ASSISTANT_USER.id;
  const isTool = message.role === Role.Tool;
  const isSystem = message.role === Role.System;

  if (isTool) {
    return <ToolMessage message={message} onExecute={onExecuteTool} />;
  }

  if (isSystem) {
    return <SystemMessage message={message} />;
  }

  const sender = participants.find(p => p.id === message.senderId);

  return (
    <div className={`group flex items-start gap-4 ${isCurrentUser ? 'justify-end' : ''}`}>
      {!isCurrentUser && <Avatar senderId={message.senderId} participants={participants} />}

      <div className="max-w-xl">
        {!isCurrentUser && !isAssistant && (
          <p className="text-xs font-semibold mb-1" style={{ color: sender?.color ? '' : '#94a3b8' }}>
            {message.senderName}
          </p>
        )}
        {!isCurrentUser && isAssistant && message.modelLabel && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>{ASSISTANT_USER.name}</span>
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide bg-slate-700/70 rounded-full text-slate-200">
              {message.modelLabel}
            </span>
          </div>
        )}
        <div
          className={`p-4 rounded-xl ${
            isCurrentUser
              ? `${sender?.color || 'bg-purple-600'} text-white rounded-br-none`
              : 'bg-slate-700 text-slate-300 rounded-bl-none'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Feedback buttons for assistant messages */}
        {isAssistant && onFeedback && (
          <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onFeedback(message.id, true)}
              className="px-2 py-1 text-xs text-green-400 hover:text-green-300 transition-colors"
              title="Helpful"
            >
              👍
            </button>
            <button
              onClick={() => onFeedback(message.id, false)}
              className="px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
              title="Not helpful"
            >
              👎
            </button>
          </div>
        )}
      </div>

      {isCurrentUser && <Avatar senderId={message.senderId} participants={participants} />}
    </div>
  );
};

export default MessageComponent;
