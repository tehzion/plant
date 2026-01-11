import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BotAvatarIcon } from './BotAvatarIcon';
import type { BotAvatar } from '@/hooks/useAvatarPreference';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  botAvatar?: BotAvatar;
}

export const TypingIndicator = ({ botAvatar }: TypingIndicatorProps) => {
  return (
    <div className="flex w-full py-6 px-4 bg-white dark:bg-[#444654]">
      <div className="flex gap-4 w-full max-w-4xl">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className={cn(
            "w-8 h-8 shadow-sm bg-gradient-to-br",
            botAvatar
              ? `${botAvatar.gradientFrom} ${botAvatar.gradientTo}`
              : "from-[#10a37f] to-[#0d9373]"
          )}>
            <AvatarFallback className="bg-transparent">
              <BotAvatarIcon avatar={botAvatar} showEffects={false} className="w-4 h-4 text-white" />
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Typing dots */}
        <div className="flex items-center gap-1 py-3">
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"
            style={{ animation: 'dot-bounce 1.4s infinite ease-in-out', animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"
            style={{ animation: 'dot-bounce 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"
            style={{ animation: 'dot-bounce 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
};
