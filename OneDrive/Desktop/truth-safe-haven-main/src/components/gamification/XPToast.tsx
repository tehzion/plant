import { useState, useEffect } from 'react';
import { XPEvent } from '@/types/gamification';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XPToastProps {
  events: XPEvent[];
}

export const XPToast = ({ events }: XPToastProps) => {
  const [exitingIds, setExitingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Mark events for exit 500ms before they're removed (at 2.5s of 3s total)
    events.forEach(event => {
      const eventId = event.timestamp.getTime();
      if (!exitingIds.has(eventId)) {
        const timer = setTimeout(() => {
          setExitingIds(prev => new Set(prev).add(eventId));
        }, 2500);
        return () => clearTimeout(timer);
      }
    });
  }, [events, exitingIds]);

  // Clean up exitingIds when events are removed
  useEffect(() => {
    const currentIds = new Set(events.map(e => e.timestamp.getTime()));
    setExitingIds(prev => {
      const newSet = new Set<number>();
      prev.forEach(id => {
        if (currentIds.has(id)) newSet.add(id);
      });
      return newSet;
    });
  }, [events]);

  if (events.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-40 flex flex-col gap-2 pointer-events-none">
      {events.slice(0, 3).map((event, index) => {
        const isExiting = exitingIds.has(event.timestamp.getTime());
        return (
          <div
            key={`${event.timestamp.getTime()}-${index}`}
            className={cn(
              "flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5",
              "gradient-emerald rounded-full shadow-lg",
              "border border-emerald-400/30",
              isExiting ? "animate-float-up" : "animate-bounce-in"
            )}
            style={{ animationDelay: isExiting ? '0ms' : `${index * 100}ms` }}
          >
            <Zap className="w-4 sm:w-5 h-4 sm:h-5 text-white drop-shadow-lg" fill="white" />
            <span className="text-sm sm:text-base font-bold text-white drop-shadow">
              +{event.xpAmount} XP
            </span>
            <div className="absolute inset-0 rounded-full animate-glow-pulse opacity-50" />
          </div>
        );
      })}
    </div>
  );
};

