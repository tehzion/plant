import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChatInputHandle {
  focus: () => void;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(({
  onSend,
  isLoading = false,
  placeholder = "Ask a question about vaccines, health, or medical facts..."
}, ref) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative bg-white dark:bg-[#40414f] border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm p-2 
                 focus-within:border-gray-400 dark:focus-within:border-gray-500 transition-colors duration-200
                 safe-area-bottom"
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-gray-900 dark:text-gray-100",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none",
            "min-h-[44px] max-h-[150px]",
            isLoading && "opacity-50"
          )}
          aria-label="Type your message"
        />

        <Button
          type="submit"
          disabled={!message.trim() || isLoading}
          size="icon"
          className={cn(
            "h-11 w-11 sm:h-10 sm:w-10 rounded-lg shrink-0 transition-all duration-200",
            message.trim()
              ? "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600"
              : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
          )}
          aria-label="Send message"
        >
          {isLoading ? (
            <Sparkles className="w-4 h-4 animate-pulse" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Helper text - hidden on mobile */}
      <div className="hidden sm:flex px-3 pb-1 pt-1.5 text-[11px] text-gray-500 dark:text-gray-400 items-center gap-1">
        <span>Press</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">Enter</kbd>
        <span>to send,</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">Shift + Enter</kbd>
        <span>for new line</span>
      </div>
    </form>
  );
});

ChatInput.displayName = 'ChatInput';
