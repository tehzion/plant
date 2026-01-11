import { BotAvatarIcon } from '@/components/chat/BotAvatarIcon';
import { ChatInput } from '@/components/chat/ChatInput';
import { BotAvatar } from '@/hooks/useAvatarPreference';
import { ChatMessage, SourceReference, TruthCard as TruthCardType } from '@/types/chat';

interface FloatingInputIslandProps {
    selectedAvatar: BotAvatar;
    onOpenModeSelector: () => void;
    onSendMessage: (content: string) => Promise<void>;
    isLoading: boolean;
    truthCards: TruthCardType[];
    messages: ChatMessage[];
    onShowTruthCard: (card: TruthCardType) => void;
}

export const FloatingInputIsland = ({
    selectedAvatar,
    onOpenModeSelector,
    onSendMessage,
    isLoading,
    truthCards,
    messages,
    onShowTruthCard
}: FloatingInputIslandProps) => {
    return (
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pointer-events-none z-30 bg-gradient-to-t from-background via-background/95 to-transparent">
            <div className="max-w-3xl mx-auto pointer-events-auto transform transition-all duration-300 hover:scale-[1.01]">
                <div className="bg-background dark:bg-background border border-border/50 shadow-2xl rounded-3xl p-3 ring-1 ring-black/5 dark:ring-white/10">

                    {/* Mode Switcher pill */}
                    {selectedAvatar && (
                        <button
                            onClick={onOpenModeSelector}
                            className="w-full mb-3 px-4 py-2 flex items-center gap-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200 group"
                        >
                            <div className={`w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center shadow-sm ${selectedAvatar.gradientFrom} ${selectedAvatar.gradientTo}`}>
                                <BotAvatarIcon icon={selectedAvatar.icon} className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                Using {selectedAvatar.name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto group-hover:text-primary transition-colors flex items-center gap-1">
                                Change Assistant
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </span>
                        </button>
                    )}

                    <ChatInput
                        onSend={onSendMessage}
                        isLoading={isLoading}
                    />

                    {/* Recent Truth Cards */}
                    {truthCards.length > 0 && messages.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
                            {truthCards.slice(-3).map((card) => (
                                <button
                                    key={card.id}
                                    onClick={() => onShowTruthCard(card)}
                                    className="shrink-0 px-3 py-1.5 bg-primary/5 rounded-full text-xs hover:bg-primary/10 transition-colors border border-primary/10 flex items-center gap-2 group"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-foreground/80 group-hover:text-primary transition-colors line-clamp-1 max-w-[150px]">{card.title}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="text-center mt-3">
                    <p className="text-[10px] text-muted-foreground/60 font-medium">
                        AI generated content. Review important info with professionals.
                    </p>
                </div>
            </div>
        </div>
    );
};
