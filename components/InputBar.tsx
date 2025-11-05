import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { User } from "../types";

interface InputBarProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
}

const InputBar: React.FC<InputBarProps> = ({ onSendMessage, disabled, currentUser, setCurrentUser, users }) => {
  const [value, setValue] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled) {
        send();
      }
    }
  };

  const containerClass = [
    "flex gap-2 items-end rounded-xl border border-slate-700/80 bg-slate-900/60 p-3",
    disabled ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="p-4 bg-slate-800 border-t border-slate-700/60">
      <div className={containerClass}>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowPicker(v => !v)}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white ${currentUser.color}`}
            disabled={disabled}
          >
            {currentUser.initials}
          </button>
          {showPicker && (
            <div className="absolute bottom-full left-0 mb-2 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-10">
              {users.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setCurrentUser(user);
                    setShowPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    user.id === currentUser.id ? "bg-slate-700 text-white" : "text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {user.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={`Message as ${currentUser.name}...`}
          className="flex-1 bg-transparent resize-none text-slate-100 placeholder-slate-500 outline-none max-h-[200px]"
        />

        <button
          type="button"
          onClick={send}
          disabled={disabled || value.trim().length === 0}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-sm font-medium text-white rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default InputBar;
