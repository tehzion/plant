import { Badge } from '@/types/gamification';
import { X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface BadgeUnlockNotificationProps {
  badge: Badge;
  onClose: () => void;
}

export const BadgeUnlockNotification = ({ badge, onClose }: BadgeUnlockNotificationProps) => {
  const { playSuccess } = useSoundEffects();

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    playSuccess();
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose, playSuccess]);

  const getTierColor = (tier: Badge['tier']) => {
    switch (tier) {
      case 'gold': return 'from-badge-gold to-yellow-600';
      case 'silver': return 'from-badge-silver to-gray-500';
      case 'bronze': return 'from-badge-bronze to-orange-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm animate-fade-in text-center">
      {/* CSS Confetti Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-confetti-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-10px`,
              backgroundColor: ['#FFD700', '#C0C0C0', '#cd7f32', '#3D8F83', '#565584'][Math.floor(Math.random() * 5)],
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 2 + 2}s`,
              borderRadius: Math.random() > 0.5 ? '50%' : '0'
            }}
          />
        ))}
      </div>

      <div className="bg-card rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-scale-in relative z-10 glass-strong">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close notification"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration header */}
        <div className="flex items-center justify-center gap-2 text-primary mb-4">
          <Star className="w-5 h-5 fill-current" />
          <span className="text-sm font-semibold uppercase tracking-wide">Badge Unlocked</span>
          <Star className="w-5 h-5 fill-current" />
        </div>

        {/* Badge icon */}
        <div className="relative mx-auto w-24 h-24 mb-4">
          <div className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-br opacity-20 blur-xl",
            getTierColor(badge.tier)
          )} />
          <div className={cn(
            "relative w-full h-full rounded-full flex items-center justify-center text-4xl",
            "bg-gradient-to-br shadow-lg animate-badge-unlock",
            getTierColor(badge.tier)
          )}>
            {badge.icon}
          </div>
        </div>

        {/* Badge info */}
        <h3 className="text-xl font-bold text-foreground mb-2 font-display">
          {badge.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {badge.description}
        </p>

        {/* XP reward */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
          <span className="text-primary font-semibold">+{badge.xpReward} XP</span>
        </div>
      </div>
    </div>
  );
};
