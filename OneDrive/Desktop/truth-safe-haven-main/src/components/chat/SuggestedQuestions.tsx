import {
  Lightbulb, TrendingUp, HelpCircle, Sparkles, AlertCircle, Zap,
  Shield, Activity, Calendar, Heart, Baby, Phone,
  HeartHandshake, CloudRain, Users, Sun, Smile
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  avatarId: string;
}

type Question = {
  question: string;
  icon: any;
  tag?: string | null;
  tagColor?: string;
};

const QUESTIONS_BY_AVATAR: Record<string, Question[]> = {
  'verifier': [
    {
      question: "Is there a link between vaccines and autism?",
      icon: AlertCircle,
      tag: "Popular",
      tagColor: "bg-amber-500/20 text-amber-600",
    },
    {
      question: "How were COVID-19 vaccines developed so quickly?",
      icon: Zap,
      tag: "Trending",
      tagColor: "bg-sky-500/20 text-sky-600",
    },
    {
      question: "Are vaccine ingredients safe?",
      icon: Shield,
      tag: null,
    },
    {
      question: "Do vaccines cause fertility issues?",
      icon: HelpCircle,
      tag: null,
    },
    {
      question: "Is natural immunity better than vaccine immunity?",
      icon: TrendingUp,
      tag: null,
    },
  ],
  'advisor': [
    {
      question: "What are common side effects of the flu shot?",
      icon: Activity,
      tag: "Common",
      tagColor: "bg-emerald-500/20 text-emerald-600",
    },
    {
      question: "What is the vaccination schedule for babies?",
      icon: Calendar,
      tag: "Parents",
      tagColor: "bg-pink-500/20 text-pink-600",
    },
    {
      question: "How can I manage pain after a shot?",
      icon: Heart,
      tag: null,
    },
    {
      question: "Is it safe to get vaccinated while pregnant?",
      icon: Baby,
      tag: null,
    },
    {
      question: "When should I call a doctor after vaccination?",
      icon: Phone,
      tag: null,
    },
  ],
  'companion': [
    {
      question: "I'm feeling anxious about needles.",
      icon: HeartHandshake,
      tag: "Support",
      tagColor: "bg-violet-500/20 text-violet-600",
    },
    {
      question: "I'm scared of side effects, can you help?",
      icon: CloudRain,
      tag: null,
    },
    {
      question: "How do I deal with family disagreements about health?",
      icon: Users,
      tag: null,
    },
    {
      question: "I just need some reassurance about safety.",
      icon: Sun,
      tag: null,
    },
    {
      question: "Is it normal to be nervous?",
      icon: Smile,
      tag: null,
    },
  ]
};

const DEFAULT_QUESTIONS = QUESTIONS_BY_AVATAR['verifier'];

export const SuggestedQuestions = ({ onSelect, avatarId }: SuggestedQuestionsProps) => {
  const questions = QUESTIONS_BY_AVATAR[avatarId] || DEFAULT_QUESTIONS;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-4">
        <div className="p-1.5 rounded-lg bg-amber-500/10">
          <Lightbulb className="w-4 h-4 text-amber-500" />
        </div>
        <span className="font-medium">Suggested questions for you:</span>
      </div>

      {/* Interactive question cards */}
      <div className="flex gap-3 overflow-x-auto pt-4 pb-3 sm:pb-0 sm:flex-wrap scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
        {questions.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <button
              key={`${avatarId}-${index}`}
              onClick={() => onSelect(item.question)}
              className={cn(
                "group relative flex-shrink-0 snap-start",
                "p-3 sm:p-4 text-left rounded-2xl",
                "bg-gradient-to-br from-secondary/80 to-secondary",
                "border border-border/50 hover:border-[hsl(var(--mode-primary)/0.5)]",
                "transition-all duration-300 ease-out",
                "hover:shadow-lg hover:shadow-[hsl(var(--mode-primary)/0.1)]",
                "hover:-translate-y-1 hover:scale-[1.02]",
                "focus-ring min-h-[80px] w-[200px] sm:w-[220px]",
                "animate-fade-in-up"
              )}
              style={{
                animationDelay: `${index * 75}ms`,
              }}
            >
              {/* Tag badge */}
              {item.tag && (
                <span className={cn(
                  "absolute -top-2 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  item.tagColor
                )}>
                  {item.tag}
                </span>
              )}

              {/* Icon with animated background */}
              <div className={cn(
                "w-8 h-8 rounded-xl mb-2 flex items-center justify-center",
                "bg-[hsl(var(--mode-primary)/0.1)] text-[hsl(var(--mode-primary))]",
                "group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
              )}>
                <IconComponent className="w-4 h-4" />
              </div>

              {/* Question text */}
              <span className="text-xs sm:text-sm font-medium line-clamp-2 leading-snug text-foreground/90 group-hover:text-foreground">
                {item.question}
              </span>

              {/* Hover shimmer effect */}
              <div className={cn(
                "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100",
                "bg-gradient-to-r from-transparent via-white/5 to-transparent",
                "transition-opacity duration-500",
                "animate-shimmer pointer-events-none"
              )} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
