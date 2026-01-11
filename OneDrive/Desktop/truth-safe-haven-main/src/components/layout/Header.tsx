import { Shield, Menu, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BotAvatar } from '@/hooks/useAvatarPreference';


interface HeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
  onClearHistory?: () => void;
  hasHistory?: boolean;
  selectedAvatar?: BotAvatar;
  onAvatarChange?: (avatarId: string) => void;
  onOpenModeSelector?: () => void;
}

export const Header = ({
  onMenuClick,
  showMenu = true,
  onClearHistory,
  hasHistory = false,
  selectedAvatar,
  onOpenModeSelector,
}: HeaderProps) => {
  return (
    <div className="flex flex-col border-b border-border transition-colors duration-300"
      style={{ borderBottomColor: `hsl(var(--mode-primary) / 0.3)` }}
    >
      {/* Main header row */}
      <header className="h-12 sm:h-14 bg-card/80 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 md:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          {showMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden min-w-[44px] min-h-[44px]"
              onClick={onMenuClick}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300" style={{ color: 'hsl(var(--mode-primary))' }} />
            <span className="font-display font-bold text-sm sm:text-base md:text-lg flex items-center gap-2">
              Vaccine Hunter
              {selectedAvatar && (
                <>
                  <span className="text-muted-foreground/40 font-light">|</span>
                  <span className="text-primary font-medium">{selectedAvatar.name}</span>
                </>
              )}
            </span>
          </div>
        </div>



        <div className="flex items-center gap-3">
          {/* Clear history button */}
          {hasHistory && onClearHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearHistory}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Clear chat history"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}


        </div>
      </header>
    </div>
  );
};