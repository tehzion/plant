import { UserProgress } from '@/types/gamification';
import { XPProgressBar } from '@/components/gamification/XPProgressBar';
import { BadgeDisplay } from '@/components/gamification/BadgeDisplay';
import { StatsCard } from '@/components/gamification/StatsCard';
import { Shield, HelpCircle, BookOpen, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SidebarProps {
  progress: UserProgress;
  levelTitle: string;
  progressPercentage: number;
  onShare?: () => void;
}

export const Sidebar = ({ progress, levelTitle, progressPercentage, onShare }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={cn(
      "h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-[85vw] max-w-80"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-lg text-sidebar-foreground">
              Vaccine Hunter
            </span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* XP Progress */}
          <XPProgressBar
            currentXP={progress.totalXP}
            xpToNextLevel={progress.xpToNextLevel}
            level={progress.level}
            levelTitle={levelTitle}
            progressPercentage={progressPercentage}
          />

          {/* Badges */}
          <BadgeDisplay
            badges={progress.badges}
            unlockedBadgeIds={progress.unlockedBadgeIds}
          />

          {/* Stats */}
          <StatsCard progress={progress} />
        </div>
      )}

      {/* Footer links */}
      {!isCollapsed && (
        <div className="p-4 border-t border-sidebar-border space-y-1">
          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-2 p-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors w-full text-left"
            >
              <Share2 className="w-4 h-4" />
              <span>Share App</span>
            </button>
          )}
          <a
            href="#"
            className="flex items-center gap-2 p-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Learn More</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-2 p-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help & Support</span>
          </a>
        </div>
      )}

      {/* Collapsed state icons */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center py-4 space-y-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{progress.level}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-lg">
            🔍
          </div>
        </div>
      )}
    </aside>
  );
};
