import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XPProgressBarProps {
  currentXP: number;
  xpToNextLevel: number;
  level: number;
  levelTitle: string;
  progressPercentage: number;
  className?: string;
}

export const XPProgressBar = ({
  currentXP,
  xpToNextLevel,
  level,
  levelTitle,
  progressPercentage,
  className,
}: XPProgressBarProps) => {
  return (
    <div className={cn("bg-card rounded-xl p-4 border border-border", className)}>
      {/* Level info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary font-display">{level}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{levelTitle}</p>
            <p className="text-xs text-muted-foreground">Level {level}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-primary">
          <Zap className="w-4 h-4" />
          <span className="text-sm font-semibold">{currentXP} XP</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="xp-bar relative overflow-hidden h-3 bg-muted rounded-full">
        {/* Glow effect background */}
        <div
          className="absolute inset-0 bg-primary/20 blur-sm transform translate-x-[-100%]"
          style={{
            transform: `translateX(${progressPercentage - 100}%)`,
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />

        <div
          className="xp-bar-fill h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 relative"
          style={{ width: `${progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress to next level: ${progressPercentage.toFixed(0)}%`}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] skew-x-[-20deg]" />

          {/* Leading glow */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-4 bg-white/50 blur-[4px] shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
        </div>
      </div>

      {/* XP to next level */}
      <p className="text-xs text-muted-foreground mt-2 text-center">
        {xpToNextLevel} XP to next level
      </p>
    </div>
  );
};
