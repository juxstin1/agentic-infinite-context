import React from "react";
import { Chat } from "../types";

interface ChatListPanelProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
}

const ChatListPanel: React.FC<ChatListPanelProps> = ({ chats, activeChatId, onSelectChat, onCreateChat }) => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800/70 flex flex-col">
      <div className="p-4 border-b border-slate-800/70 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Chats</h2>
        <button
          type="button"
          onClick={onCreateChat}
          className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-500"
        >
          New
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {chats.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500">No chats yet. Create one to get started.</p>
        )}
        {chats.map(chat => {
          const isActive = chat.id === activeChatId;
          return (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat.id)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-slate-800/50 ${
                isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <div className="font-medium">{chat.title}</div>
              <div className="text-xs text-slate-400">{chat.participants.length} participants</div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default ChatListPanel;
