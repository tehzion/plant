import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { BotAvatarIcon } from './BotAvatarIcon';
import { BOT_AVATARS, type BotAvatar } from '@/hooks/useAvatarPreference';
import { cn } from '@/lib/utils';
import { Check, ShieldCheck, Stethoscope, HeartPulse } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAvatar: BotAvatar;
  onSelect: (avatarId: string) => void;
}

const getModeIcon = (icon: string) => {
  switch (icon) {
    case 'shield-check': return ShieldCheck;
    case 'stethoscope': return Stethoscope;
    case 'heart-pulse': return HeartPulse;
    default: return ShieldCheck;
  }
};

const ModeCards = ({ selectedAvatar, onSelect, onClose }: Omit<ModeSelectorProps, 'isOpen'>) => {
  const handleSelect = (avatarId: string) => {
    onSelect(avatarId);
    onClose();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {BOT_AVATARS.map((avatar) => {
          const isSelected = selectedAvatar.id === avatar.id;
          const IconComponent = getModeIcon(avatar.icon);
          
          return (
            <button
              key={avatar.id}
              onClick={() => handleSelect(avatar.id)}
              className={cn(
                "relative flex flex-col items-center p-5 sm:p-6 rounded-xl transition-all duration-300",
                "border-2 focus-ring text-center group",
                isSelected
                  ? "border-primary bg-primary/5 shadow-lg scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-muted/50 hover:shadow-md"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-scale-in">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              
              {/* Avatar icon */}
              <div className={cn(
                "w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg mb-4",
                "transition-transform duration-300 group-hover:scale-110",
                avatar.gradientFrom,
                avatar.gradientTo
              )}>
                <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              
              {/* Name */}
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                {avatar.name}
              </h3>
              
              {/* Description */}
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {avatar.description}
              </p>
              
              {/* Mode type badge */}
              <div className={cn(
                "mt-3 px-3 py-1 rounded-full text-xs font-medium",
                "bg-muted text-muted-foreground"
              )}>
                {avatar.mode === 'factcheck' && 'Fact-Checking'}
                {avatar.mode === 'consultation' && 'Health Advice'}
                {avatar.mode === 'mental' && 'Mental Wellness'}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Footer note */}
      <p className="text-xs text-center text-muted-foreground">
        All assistants are powered by verified health sources. You can switch anytime.
      </p>
    </div>
  );
};

export const ModeSelector = ({ isOpen, onClose, selectedAvatar, onSelect }: ModeSelectorProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="text-center pb-4">
            <DrawerTitle className="text-xl font-semibold">Choose Your AI Assistant</DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Each assistant specializes in different support
            </p>
          </DrawerHeader>
          <ModeCards selectedAvatar={selectedAvatar} onSelect={onSelect} onClose={onClose} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-xl font-semibold">Choose Your AI Assistant</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Each assistant specializes in different support
          </p>
        </DialogHeader>
        <ModeCards selectedAvatar={selectedAvatar} onSelect={onSelect} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};
