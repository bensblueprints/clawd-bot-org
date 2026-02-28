"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface TerminalInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  commandHistory: string[];
}

export default function TerminalInput({ onSubmit, disabled, commandHistory }: TerminalInputProps) {
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [disabled]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
      e.preventDefault();
      onSubmit(input.trim());
      setInput("");
      setHistoryIndex(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  }

  return (
    <div className="border-t border-border bg-surface p-4">
      <div className="flex items-center gap-3 font-mono">
        <span className="text-green font-semibold">
          {disabled ? "..." : ">"}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Processing..." : "Enter a task or command..."}
          className="flex-1 bg-transparent text-text placeholder:text-text-muted outline-none text-sm"
          autoFocus
        />
        <button
          onClick={() => {
            if (input.trim()) {
              onSubmit(input.trim());
              setInput("");
              setHistoryIndex(-1);
            }
          }}
          disabled={disabled || !input.trim()}
          className="bg-accent hover:bg-accent/80 disabled:bg-border disabled:text-text-muted text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
        <span>Press <kbd className="bg-bg px-1 py-0.5 rounded">Enter</kbd> to send</span>
        <span><kbd className="bg-bg px-1 py-0.5 rounded">↑</kbd> <kbd className="bg-bg px-1 py-0.5 rounded">↓</kbd> for history</span>
      </div>
    </div>
  );
}
