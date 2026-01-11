import { HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';
import type { BotAvatar } from '@/hooks/useAvatarPreference';
import { cn } from '@/lib/utils';

interface BotAvatarIconProps {
  avatar?: BotAvatar;
  icon?: BotAvatar['icon'];
  className?: string;
  showEffects?: boolean;
}

const getAnimationClass = (animation?: BotAvatar['animation']) => {
  switch (animation) {
    case 'heartbeat':
      return 'animate-avatar-heartbeat';
    case 'shimmer':
      return 'animate-avatar-shimmer';
    case 'pulse':
    default:
      return 'animate-avatar-pulse';
  }
};

const IconComponent = ({ icon, className }: { icon: BotAvatar['icon']; className?: string }) => {
  const iconProps = { className };
  
  switch (icon) {
    case 'heart-pulse':
      return <HeartPulse {...iconProps} />;
    case 'shield-check':
      return <ShieldCheck {...iconProps} />;
    case 'stethoscope':
    default:
      return <Stethoscope {...iconProps} />;
  }
};

export const BotAvatarIcon = ({ 
  avatar, 
  icon = 'stethoscope', 
  className = "w-5 h-5", 
  showEffects = false 
}: BotAvatarIconProps) => {
  const iconType = avatar?.icon || icon;
  
  if (!showEffects || !avatar) {
    return <IconComponent icon={iconType} className={className} />;
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Decorative ring */}
      <div 
        className={cn(
          "absolute -inset-1 rounded-full border-2 border-white/30",
          getAnimationClass(avatar.animation)
        )}
      />
      
      {/* Icon */}
      <IconComponent 
        icon={iconType} 
        className={cn(className, "relative z-10 drop-shadow-sm")} 
      />
    </div>
  );
};
