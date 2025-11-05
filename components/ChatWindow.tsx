import React, { useEffect, useRef } from "react";
import { Message, User, StreamingResponse, ToolCall } from "../types";
import MessageComponent from "./Message";
import { ASSISTANT_USER } from "../constants";

interface ChatWindowProps {
  messages: Message[];
  isThinking: boolean;
  currentUserId: string;
  participants: User[];
  streamingResponses: StreamingResponse[];
  routedAgents: string[];
  onExecuteTool?: (toolCall: ToolCall, messageId: string) => Promise<void>;
  onFeedback?: (messageId: string, thumbsUp: boolean) => void;
}

const StreamingBubble: React.FC<{ response: StreamingResponse }> = ({ response }) => {
  const isError = response.status === "error";

  return (
    <div className="flex items-start gap-4">
      <div className={`w-8 h-8 rounded-full ${ASSISTANT_USER.color} flex-shrink-0`}></div>
      <div className="max-w-xl">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <span>{ASSISTANT_USER.name}</span>
          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide bg-slate-700/70 rounded-full text-slate-200">
            {response.modelLabel}
          </span>
        </div>
        <div className={`p-4 rounded-xl border ${
          isError
            ? "bg-red-950/40 border-red-700/50 text-red-200"
            : "bg-slate-700 text-slate-200 border-slate-600/70"
        }`}>
          <p className="whitespace-pre-wrap min-h-[1rem]">
            {response.content || (isError ? "Stream failed." : "...")}
          </p>
          {!isError && (
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-300">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></span>
              <span>Streaming...</span>
            </div>
          )}
          {isError && response.error && (
            <p className="mt-3 text-xs text-red-300">{response.error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isThinking,
  currentUserId,
  participants,
  streamingResponses,
  routedAgents,
  onExecuteTool,
  onFeedback,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, streamingResponses, routedAgents]);

  const showSpinner = isThinking && streamingResponses.length === 0;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {routedAgents.length > 0 && (
        <div className="text-xs text-slate-400">
          Routed to: {routedAgents.join(", ")}
        </div>
      )}

      {messages.map(msg => (
        <MessageComponent
          key={msg.id}
          message={msg}
          currentUserId={currentUserId}
          participants={participants}
          onExecuteTool={onExecuteTool}
          onFeedback={onFeedback}
        />
      ))}

      {streamingResponses.map(response => (
        <StreamingBubble key={response.id} response={response} />
      ))}

      {showSpinner && (
        <div className="flex items-start gap-4 animate-pulse">
          <div className={`w-8 h-8 rounded-full ${ASSISTANT_USER.color} flex-shrink-0`}></div>
          <div className="flex items-center space-x-1 pt-2">
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;
