import { cn } from '@/lib/utils';
import { BotAvatarIcon } from './BotAvatarIcon';
import { type BotAvatar } from '@/hooks/useAvatarPreference';
import { ChevronDown } from 'lucide-react';

interface ModeIndicatorBarProps {
  avatar: BotAvatar;
  onSwitchClick: () => void;
}

// Get mode accent color for left border
const getModeAccentClass = (mode: string) => {
  switch (mode) {
    case 'factcheck': return 'border-l-emerald-500';
    case 'consultation': return 'border-l-blue-500';
    case 'mental': return 'border-l-purple-500';
    default: return 'border-l-primary';
  }
};

export const ModeIndicatorBar = ({ avatar, onSwitchClick }: ModeIndicatorBarProps) => {
  return (
    <button
      onClick={onSwitchClick}
      className={cn(
        "w-full px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 transition-all duration-300",
        "bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50",
        "border-b border-border/50 group min-h-[48px] sm:min-h-0",
        "border-l-4",
        getModeAccentClass(avatar.mode)
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center shadow-sm",
        "transition-transform duration-200 group-hover:scale-105",
        avatar.gradientFrom,
        avatar.gradientTo
      )}>
        <BotAvatarIcon icon={avatar.icon} className="w-4 h-4 text-white" />
      </div>
      
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{avatar.name}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">·</span>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            {avatar.description}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
        <span className="text-xs font-medium hidden sm:inline">Switch</span>
        <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
      </div>
    </button>
  );
};
