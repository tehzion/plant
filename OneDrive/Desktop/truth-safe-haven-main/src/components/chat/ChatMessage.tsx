
import { ChatMessage as ChatMessageType, SourceReference } from '@/types/chat';
import { Shield, User, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BotAvatarIcon } from './BotAvatarIcon';
import { ExpandableSourceCard } from './ExpandableSourceCard';
import type { BotAvatar } from '@/hooks/useAvatarPreference';



interface ChatMessageProps {
  message: ChatMessageType;
  onSourceClick?: (source: SourceReference) => void;
  onFollowUpClick?: (question: string) => void;
  botAvatar?: BotAvatar;
}

export const ChatMessage = ({ message, onSourceClick, onFollowUpClick, botAvatar }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const isGreeting = message.id.startsWith('greeting-');



  return (
    <div
      className={cn(
        "flex w-full mb-6 animate-pop-in",
        isUser ? "justify-end" : "justify-start bg-white dark:bg-[#444654]"
      )}
    >
      <div className={cn(
        "flex gap-3 w-full",
        isUser ? "max-w-3xl flex-row-reverse" : "max-w-4xl flex-row"
      )}>
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className={cn(
            "w-8 h-8 shadow-sm bg-gradient-to-br relative",
            isUser
              ? "from-[#5436DA] to-[#8E5BF5]"
              : botAvatar
                ? `${botAvatar.gradientFrom} ${botAvatar.gradientTo}`
                : "from-[#10a37f] to-[#0d9373]"
          )}>
            <AvatarFallback className="bg-transparent">
              {isUser ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <BotAvatarIcon avatar={botAvatar} showEffects={false} className="w-4 h-4 text-white" />
              )}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Message content */}
        <div className={cn("min-w-0 font-sans", isUser ? "" : "flex-1")}>
          <div className={cn(
            "relative px-5 py-3.5 shadow-sm transition-all duration-200",
            isUser
              ? "bg-gradient-to-br from-primary to-emerald-600 text-white rounded-2xl rounded-tr-sm mx-2 animate-pop-in"
              : "bg-white dark:bg-card border border-border/50 rounded-2xl rounded-tl-sm text-foreground hover:shadow-md"
          )}>
            <p className={cn(
              "text-[15px] leading-relaxed whitespace-pre-wrap",
              isUser ? "text-white/95 font-medium" : "text-foreground/90"
            )}>
              {message.content}
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-current opacity-50 animate-blink" />
              )}
            </p>
          </div>

          {/* Source references with fact verification (only show after streaming completes) */}
          {!isUser && !isStreaming && message.sources && message.sources.length > 0 && (
            <div className="mt-3 ml-1 animate-fade-in group">
              {/* Header with fact verified badge */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-emerald-500" />
                    Verified Sources
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                      {message.sources.length}
                    </span>
                  </span>
                </div>
                {message.isFactVerified && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
                    <BadgeCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Verified</span>
                  </div>
                )}
              </div>

              {/* Expandable source cards with glass effect */}
              <div className="space-y-2 relative">
                <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-border/50 to-transparent rounded-full" />
                {message.sources.map((source) => (
                  <ExpandableSourceCard
                    key={source.id}
                    source={source}
                    onSourceClick={onSourceClick}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Follow-up questions (only show after streaming completes) - Perplexity style */}
          {!isUser && !isStreaming && message.followUpQuestions && message.followUpQuestions.length > 0 && (
            <div className="mt-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Related</p>
              </div>
              <div className="grid gap-2">
                {message.followUpQuestions.slice(0, 3).map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => onFollowUpClick?.(question)}
                    className="group flex items-start gap-3 p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750
                             border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200
                             text-left focus-ring hover:shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700"
                  >
                    <span className="text-emerald-600 dark:text-emerald-400 text-lg mt-0.5 shrink-0 group-hover:scale-110 transition-transform">→</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{question}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};
