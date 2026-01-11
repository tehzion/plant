import { Shield, Heart, Lock, Sparkles, Trophy, User } from 'lucide-react';
import type { BotAvatar } from '@/hooks/useAvatarPreference';
import { BotAvatarIcon } from '@/components/chat/BotAvatarIcon';
import { cn } from '@/lib/utils';

interface WelcomeScreenProps {
  currentAvatar: BotAvatar;
  allAvatars: BotAvatar[];
  onAvatarClick: (avatar: BotAvatar) => void;
}

export const WelcomeScreen = ({ currentAvatar, allAvatars, onAvatarClick }: WelcomeScreenProps) => {
  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in min-h-[80vh]">
      {/* Ambient Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/30 rounded-full blur-3xl opacity-50 animate-blob animation-delay-2000" />
      </div>

      {/* Hero Header */}
      <div className="relative mb-8 sm:mb-10 text-center z-10">
        <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-lg ring-1 ring-white/50 dark:ring-white/10 animate-float-up">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-inner">
              <Shield className="w-8 sm:w-10 h-8 sm:h-10 text-white drop-shadow-md" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg animate-bounce-subtle">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          Vaccine Hunter
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Your trusted sanctuary for verified health facts.
          <br className="hidden sm:block" />
          Ask freely. Learn safely.
        </p>
      </div>

      {/* Hero: Meet Your Team (Asymmetric Layout) */}
      <div className="w-full mb-12 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-6 opacity-80">
          <span className="h-px w-8 bg-border"></span>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Choose Your Guide</span>
          <span className="h-px w-8 bg-border"></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {allAvatars.map((avatar, idx) => (
            <button
              key={avatar.id}
              onClick={() => onAvatarClick(avatar)}
              className={cn(
                "group relative flex flex-col p-6 rounded-3xl transition-all duration-500 text-left border overflow-hidden",
                "hover:-translate-y-2 hover:shadow-xl",
                currentAvatar.id === avatar.id
                  ? "bg-white/90 dark:bg-white/10 border-primary/50 shadow-lg ring-1 ring-primary/20 scale-105 z-10"
                  : "bg-white/40 dark:bg-white/5 border-white/20 hover:bg-white/60 dark:hover:bg-white/10 hover:border-primary/30"
              )}
            >
              {/* Gradient overlay for active state */}
              {currentAvatar.id === avatar.id && (
                <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${avatar.gradientFrom} ${avatar.gradientTo}`} />
              )}

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "p-3 rounded-2xl transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110",
                    "bg-gradient-to-br shadow-inner",
                    avatar.gradientFrom, avatar.gradientTo
                  )}>
                    <BotAvatarIcon
                      avatar={avatar}
                      showEffects={currentAvatar.id === avatar.id}
                      className="w-8 h-8 text-white"
                    />
                  </div>
                  {currentAvatar.id === avatar.id && (
                    <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold animate-pulse">
                      Active
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {avatar.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {avatar.description}
                </p>

                {/* Decorative circle */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-2xl group-hover:scale-150 transition-transform duration-700" />
              </div>
            </button>
          ))}
        </div>

        {/* Gamification Tip */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium">
            <Trophy className="w-4 h-4" />
            <span>Pro tip: Try all assistants to unlock the <strong>Explorer</strong> badge!</span>
          </div>
        </div>
      </div>

      {/* Trust Pillars (Minimal Footer) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl border-t border-border/50 pt-8 opacity-70 hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          <span className="text-xs font-semibold text-foreground">Verified Sources</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Lock className="w-5 h-5 text-blue-500" />
          <span className="text-xs font-semibold text-foreground">Private & Safe</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          <span className="text-xs font-semibold text-foreground">Judgment Free</span>
        </div>
      </div>
    </div>
  );
};
