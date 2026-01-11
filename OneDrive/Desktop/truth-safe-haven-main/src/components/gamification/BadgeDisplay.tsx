import { Badge } from '@/types/gamification';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { BadgeTrophyRoom } from './BadgeTrophyRoom';

interface BadgeDisplayProps {
  badges: Badge[];
  unlockedBadgeIds: string[];
  className?: string;
}

export const BadgeDisplay = ({ badges, unlockedBadgeIds, className }: BadgeDisplayProps) => {
  const getTierColor = (tier: Badge['tier'], isUnlocked: boolean) => {
    if (!isUnlocked) return 'bg-muted text-muted-foreground border-2 border-dashed border-gray-600/30';
    switch (tier) {
      case 'gold': return 'bg-gradient-to-br from-[#ffd700] via-[#fdb931] to-[#e6ac00] text-white shadow-[0_0_15px_rgba(255,215,0,0.5)] border border-yellow-200/50';
      case 'silver': return 'bg-gradient-to-br from-[#e0e0e0] via-[#c0c0c0] to-[#a0a0a0] text-white shadow-[0_0_15px_rgba(192,192,192,0.5)] border border-white/50';
      case 'bronze': return 'bg-gradient-to-br from-[#ffaf7b] via-[#d76b29] to-[#a0400b] text-white shadow-[0_0_15px_rgba(215,107,41,0.5)] border border-orange-200/50';
    }
  };

  const getTierGlow = (tier: Badge['tier']) => {
    switch (tier) {
      case 'gold': return 'bg-badge-gold';
      case 'silver': return 'bg-badge-silver';
      case 'bronze': return 'bg-badge-bronze';
    }
  };

  const [showTrophyRoom, setShowTrophyRoom] = useState(false);

  // Calculate stats for Trophy Room
  // Note: These would ideally come from props, currently approximated or assuming parent passes them
  // For now, simpler to just pass badges/unlocked

  return (
    <>
      <div className={cn("bg-card rounded-xl p-4 border border-border", className)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground font-display">Badges</h3>
          <button
            onClick={() => setShowTrophyRoom(true)}
            className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
          >
            View All
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {badges.slice(0, 8).map((badge) => {
            const isUnlocked = unlockedBadgeIds.includes(badge.id);

            return (
              <button
                key={badge.id}
                onClick={() => setShowTrophyRoom(true)}
                className="group relative w-full aspect-square"
                title={`${badge.name}: ${badge.description}`}
              >
                {/* Badge container */}
                <div
                  className={cn(
                    "badge-container w-full h-full rounded-full flex items-center justify-center text-lg sm:text-xl",
                    "transition-transform hover:scale-110",
                    getTierColor(badge.tier, isUnlocked),
                    isUnlocked && "animate-scale-in"
                  )}
                >
                  {/* Glow effect for unlocked badges */}
                  {isUnlocked && (
                    <div className={cn("badge-glow", getTierGlow(badge.tier))} />
                  )}

                  {/* Badge icon or lock */}
                  <span className="relative z-10">
                    {isUnlocked ? badge.icon : <Lock className="w-4 h-4" />}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trophy Room Modal */}
      {showTrophyRoom && (
        <BadgeTrophyRoom
          badges={badges}
          unlockedBadgeIds={unlockedBadgeIds}
          totalXP={0} // TODO: Pass from Sidebar
          level={0}   // TODO: Pass from Sidebar
          onClose={() => setShowTrophyRoom(false)}
        />
      )}
    </>
  );
};
