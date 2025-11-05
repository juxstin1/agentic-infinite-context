import React from 'react';
import { Message, Role, User } from '../types';
import { WrenchIcon } from './Icons';
import { ASSISTANT_USER } from '../constants';

interface MessageProps {
  message: Message;
  currentUserId: string;
  participants: User[];
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

const ToolMessage: React.FC<{ message: Message }> = ({ message }) => {
  if (!message.toolCall) return null;
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
          <button className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded text-white transition-colors">Execute</button>
          <button className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-700 rounded text-white transition-colors">Dismiss</button>
        </div>
      </div>
    </div>
  );
};

const MessageComponent: React.FC<MessageProps> = ({ message, currentUserId, participants }) => {
  const isCurrentUser = message.senderId === currentUserId;
  const isAssistant = message.senderId === ASSISTANT_USER.id;
  const isTool = message.role === Role.Tool;

  if (isTool) {
    return <ToolMessage message={message} />;
  }

  const sender = participants.find(p => p.id === message.senderId);

  return (
    <div className={`flex items-start gap-4 ${isCurrentUser ? 'justify-end' : ''}`}>
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
      </div>

      {isCurrentUser && <Avatar senderId={message.senderId} participants={participants} />}
    </div>
  );
};

export default MessageComponent;
