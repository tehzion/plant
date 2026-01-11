import { Badge } from '@/types/gamification';
import { X, Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface BadgeTrophyRoomProps {
    badges: Badge[];
    unlockedBadgeIds: string[];
    totalXP: number;
    level: number;
    onClose: () => void;
}

export const BadgeTrophyRoom = ({ badges, unlockedBadgeIds, totalXP, level, onClose }: BadgeTrophyRoomProps) => {
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const getTierGradient = (tier: Badge['tier']) => {
        switch (tier) {
            case 'gold': return 'from-yellow-400 to-yellow-600';
            case 'silver': return 'from-gray-300 to-gray-500';
            case 'bronze': return 'from-orange-400 to-orange-700';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-4xl h-[80vh] bg-card/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-in">

                {/* Left Panel - Grid */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
                                <Trophy className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold font-display">Trophy Room</h2>
                                <p className="text-muted-foreground">Level {level} • {totalXP} XP</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="md:hidden p-2 hover:bg-muted rounded-full"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                        {badges.map((badge) => {
                            const isUnlocked = unlockedBadgeIds.includes(badge.id);
                            const isSelected = selectedBadge?.id === badge.id;

                            return (
                                <button
                                    key={badge.id}
                                    onClick={() => setSelectedBadge(badge)}
                                    className={cn(
                                        "aspect-square rounded-2xl flex items-center justify-center relative group transition-all duration-300 shadow-md",
                                        isUnlocked
                                            ? "bg-gradient-to-br border hover:scale-105 hover:shadow-xl hover:z-10"
                                            : "bg-muted/50 border border-border/50 opacity-60",
                                        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                                        // Vibrant Metallic Styles
                                        isUnlocked && badge.tier === 'gold' && "from-[#ffd700] via-[#fdb931] to-[#e6ac00] border-yellow-200/50 text-white shadow-[0_0_15px_rgba(255,215,0,0.3)]",
                                        isUnlocked && badge.tier === 'silver' && "from-[#e0e0e0] via-[#c0c0c0] to-[#a0a0a0] border-white/50 text-white shadow-[0_0_15px_rgba(192,192,192,0.3)]",
                                        isUnlocked && badge.tier === 'bronze' && "from-[#ffaf7b] via-[#d76b29] to-[#a0400b] border-orange-200/50 text-white shadow-[0_0_15px_rgba(215,107,41,0.3)]",
                                    )}
                                >
                                    <div className={cn(
                                        "text-3xl transition-transform duration-300",
                                        isUnlocked ? "group-hover:scale-110" : "grayscale blur-[1px]"
                                    )}>
                                        {isUnlocked ? badge.icon : <Lock className="w-6 h-6 text-muted-foreground" />}
                                    </div>

                                    {isUnlocked && (
                                        <div className={cn(
                                            "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
                                            "bg-gradient-to-tr from-white/0 via-white/5 to-white/0"
                                        )} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel - Details (Desktop) */}
                <div className="hidden md:flex w-80 lg:w-96 border-l border-white/10 bg-muted/30 flex-col p-8 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {selectedBadge ? (
                        <div className="flex flex-col h-full items-center text-center mt-10 animate-fade-in">
                            <div className={cn(
                                "w-32 h-32 rounded-full flex items-center justify-center text-6xl shadow-2xl mb-8 relative",
                                "bg-gradient-to-br",
                                unlockedBadgeIds.includes(selectedBadge.id)
                                    ? getTierGradient(selectedBadge.tier)
                                    : "from-gray-700 to-gray-900"
                            )}>
                                <div className="absolute inset-0 rounded-full bg-white/20 blur-xl opacity-50" />
                                <span className="relative z-10">
                                    {unlockedBadgeIds.includes(selectedBadge.id) ? selectedBadge.icon : <Lock className="w-12 h-12 text-gray-500" />}
                                </span>
                            </div>

                            <div className="space-y-2 mb-8">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                    unlockedBadgeIds.includes(selectedBadge.id)
                                        ? "bg-primary/20 text-primary"
                                        : "bg-muted text-muted-foreground"
                                )}>
                                    {selectedBadge.tier} Tier
                                </span>
                                <h3 className="text-2xl font-bold font-display">{selectedBadge.name}</h3>
                            </div>

                            <div className="bg-card/50 rounded-xl p-6 w-full backdrop-blur-sm border border-white/5">
                                <p className="text-muted-foreground leading-relaxed">
                                    {selectedBadge.description}
                                </p>
                                <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Reward</span>
                                    <span className="font-bold text-primary">+{selectedBadge.xpReward} XP</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full items-center justify-center text-center text-muted-foreground">
                            <Trophy className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a badge to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
