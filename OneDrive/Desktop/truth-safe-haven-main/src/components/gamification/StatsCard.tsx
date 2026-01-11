import { UserProgress } from '@/types/gamification';
import { CheckCircle, MessageCircle, Share2, Flame } from 'lucide-react';

interface StatsCardProps {
  progress: UserProgress;
  className?: string;
}

export const StatsCard = ({ progress, className }: StatsCardProps) => {
  const stats = [
    { 
      icon: CheckCircle, 
      label: 'Facts Verified', 
      value: progress.factsVerified,
      color: 'text-success'
    },
    { 
      icon: MessageCircle, 
      label: 'Questions', 
      value: progress.questionsAsked,
      color: 'text-primary'
    },
    { 
      icon: Share2, 
      label: 'Cards Shared', 
      value: progress.truthCardsShared,
      color: 'text-info'
    },
    { 
      icon: Flame, 
      label: 'Day Streak', 
      value: progress.currentStreak,
      color: 'text-destructive'
    },
  ];

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-foreground mb-3 font-display">Your Stats</h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className="bg-secondary/50 rounded-xl p-3 text-center"
          >
            <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
