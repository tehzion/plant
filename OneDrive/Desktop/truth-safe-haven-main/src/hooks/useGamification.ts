import { useState, useCallback, useEffect } from 'react';
import {
  UserProgress,
  XPEvent,
  Badge,
  XP_VALUES,
  LEVEL_THRESHOLDS,
  LEVEL_TITLES,
  BADGE_DEFINITIONS
} from '@/types/gamification';

const calculateLevel = (totalXP: number): { level: number; xpToNext: number } => {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1000;
  const xpToNext = nextThreshold - totalXP;

  return { level, xpToNext: Math.max(0, xpToNext) };
};

const initialProgress: UserProgress = {
  id: 'user-1',
  level: 1,
  currentXP: 0,
  totalXP: 0,
  xpToNextLevel: LEVEL_THRESHOLDS[1],
  factsVerified: 0,
  questionsAsked: 0,
  truthCardsShared: 0,
  currentStreak: 1,
  longestStreak: 1,
  sourcesExplored: [],
  assistantsTried: [],
  badges: BADGE_DEFINITIONS.map(b => ({ ...b, progress: 0 })),
  unlockedBadgeIds: [],
};

const GAMIFICATION_STORAGE_KEY = 'vaccine-hunter-gamification';

export const useGamification = () => {
  const [progress, setProgress] = useState<UserProgress>(initialProgress);
  const [recentXPEvents, setRecentXPEvents] = useState<XPEvent[]>([]);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);

  // Load gamification progress from encrypted storage on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const { getSecureItem } = await import('@/lib/secureStorage');
        const stored = await getSecureItem<UserProgress>(GAMIFICATION_STORAGE_KEY);

        if (stored) {
          // Ensure badges array is up to date with latest definitions
          const existingIds = stored.badges.map(b => b.id);
          const missingBadges = BADGE_DEFINITIONS.filter(def => !existingIds.includes(def.id));

          setProgress({
            ...stored,
            badges: [...stored.badges, ...missingBadges.map(b => ({ ...b, progress: 0 }))]
          });
        }
      } catch (error) {
        console.error('Failed to load gamification progress:', error);
      }
    };

    loadProgress();
  }, []);

  // Persist gamification progress to encrypted storage
  useEffect(() => {
    const saveProgress = async () => {
      try {
        const { setSecureItem } = await import('@/lib/secureStorage');
        await setSecureItem(GAMIFICATION_STORAGE_KEY, progress);
      } catch (error) {
        console.error('Failed to save gamification progress:', error);
      }
    };

    saveProgress();
  }, [progress]);

  // Hydrate badges from definitions to ensure we list any new badges immediately
  useEffect(() => {
    setProgress(prev => {
      const existingIds = prev.badges.map(b => b.id);
      const missingBadges = BADGE_DEFINITIONS.filter(def => !existingIds.includes(def.id));
      if (missingBadges.length === 0) return prev;

      return {
        ...prev,
        badges: [...prev.badges, ...missingBadges.map(b => ({ ...b, progress: 0 }))]
      };
    });
  }, []);

  const checkBadgeUnlocks = useCallback((updatedProgress: UserProgress): Badge | null => {
    for (const badge of BADGE_DEFINITIONS) {
      if (updatedProgress.unlockedBadgeIds.includes(badge.id)) continue;

      let shouldUnlock = false;
      switch (badge.requirement.type) {
        case 'facts_verified':
          shouldUnlock = updatedProgress.factsVerified >= badge.requirement.count;
          break;
        case 'questions_asked':
          shouldUnlock = updatedProgress.questionsAsked >= badge.requirement.count;
          break;
        case 'truth_cards_shared':
          shouldUnlock = updatedProgress.truthCardsShared >= badge.requirement.count;
          break;
        case 'streak_days':
          shouldUnlock = updatedProgress.currentStreak >= badge.requirement.count;
          break;
        case 'sources_explored':
          shouldUnlock = updatedProgress.sourcesExplored.length >= badge.requirement.count;
          break;
        case 'assistants_tried':
          shouldUnlock = updatedProgress.assistantsTried.length >= badge.requirement.count;
          break;
      }

      if (shouldUnlock) {
        return { ...badge, unlockedAt: new Date() };
      }
    }
    return null;
  }, []);

  const awardXP = useCallback((eventType: XPEvent['type'], customDescription?: string) => {
    const xpAmount = XP_VALUES[eventType];
    const event: XPEvent = {
      type: eventType,
      xpAmount,
      description: customDescription || `Earned ${xpAmount} XP for ${eventType.replace(/_/g, ' ')}`,
      timestamp: new Date(),
    };

    setRecentXPEvents(prev => [event, ...prev.slice(0, 4)]);

    // Auto-clear XP event after 3 seconds
    setTimeout(() => {
      setRecentXPEvents(prev => prev.filter(e => e.timestamp.getTime() !== event.timestamp.getTime()));
    }, 3000);

    setProgress(prev => {
      const newTotalXP = prev.totalXP + xpAmount;
      const { level, xpToNext } = calculateLevel(newTotalXP);

      let updatedProgress: UserProgress = {
        ...prev,
        totalXP: newTotalXP,
        currentXP: newTotalXP - (LEVEL_THRESHOLDS[level - 1] || 0),
        level,
        xpToNextLevel: xpToNext,
      };

      // Update specific counters based on event type
      switch (eventType) {
        case 'question_asked':
          updatedProgress.questionsAsked += 1;
          break;
        case 'fact_verified':
          updatedProgress.factsVerified += 1;
          break;
        case 'truth_card_shared':
          updatedProgress.truthCardsShared += 1;
          break;
      }

      // Check for badge unlocks
      const unlockedBadge = checkBadgeUnlocks(updatedProgress);
      if (unlockedBadge) {
        updatedProgress = {
          ...updatedProgress,
          totalXP: updatedProgress.totalXP + unlockedBadge.xpReward,
          unlockedBadgeIds: [...updatedProgress.unlockedBadgeIds, unlockedBadge.id],
        };
        setNewBadge(unlockedBadge);
        setTimeout(() => setNewBadge(null), 3000); // Badges disappear after 3 seconds
      }

      return updatedProgress;
    });
  }, [checkBadgeUnlocks]);

  const addSourceExplored = useCallback((sourceId: string) => {
    setProgress(prev => {
      if (prev.sourcesExplored.includes(sourceId)) return prev;

      const updatedProgress = {
        ...prev,
        sourcesExplored: [...prev.sourcesExplored, sourceId],
      };

      // Award XP for exploring new source (manually to avoid state conflict)
      const xpAmount = XP_VALUES['source_explored'];
      const event: XPEvent = {
        type: 'source_explored',
        xpAmount,
        description: `Explored ${sourceId} as a trusted source`,
        timestamp: new Date(),
      };

      setRecentXPEvents(prev => [event, ...prev.slice(0, 4)]);
      setTimeout(() => {
        setRecentXPEvents(prev => prev.filter(e => e.timestamp.getTime() !== event.timestamp.getTime()));
      }, 3000);

      const newTotalXP = updatedProgress.totalXP + xpAmount;
      const { level, xpToNext } = calculateLevel(newTotalXP);

      updatedProgress.totalXP = newTotalXP;
      updatedProgress.currentXP = newTotalXP - (LEVEL_THRESHOLDS[level - 1] || 0);
      updatedProgress.level = level;
      updatedProgress.xpToNextLevel = xpToNext;

      return updatedProgress;
    });
  }, []);

  const trackAssistantUsed = useCallback((assistantId: string) => {
    setProgress(prev => {
      if (prev.assistantsTried.includes(assistantId)) return prev;

      const updatedProgress: UserProgress = {
        ...prev,
        assistantsTried: [...prev.assistantsTried, assistantId],
      };

      // Award XP for trying new assistant
      const xpAmount = 15; // Similar to source_explored

      const event: XPEvent = {
        type: 'source_explored',
        xpAmount,
        description: `Tried new assistant: ${assistantId}`,
        timestamp: new Date(),
      };

      setRecentXPEvents(prev => [event, ...prev.slice(0, 4)]);
      setTimeout(() => {
        setRecentXPEvents(prev => prev.filter(e => e.timestamp.getTime() !== event.timestamp.getTime()));
      }, 3000);

      const newTotalXP = updatedProgress.totalXP + xpAmount;
      const { level, xpToNext } = calculateLevel(newTotalXP);

      updatedProgress.totalXP = newTotalXP;
      updatedProgress.currentXP = newTotalXP - (LEVEL_THRESHOLDS[level - 1] || 0);
      updatedProgress.level = level;
      updatedProgress.xpToNextLevel = xpToNext;

      // Check for badge unlocks
      const unlockedBadge = checkBadgeUnlocks(updatedProgress);
      if (unlockedBadge) {
        updatedProgress.unlockedBadgeIds = [...updatedProgress.unlockedBadgeIds, unlockedBadge.id];
        updatedProgress.totalXP += unlockedBadge.xpReward;
        setNewBadge(unlockedBadge);
        setTimeout(() => setNewBadge(null), 3000); // Badges disappear after 3 seconds
      }

      return updatedProgress;
    });
  }, [checkBadgeUnlocks]);

  const getLevelTitle = useCallback((level: number): string => {
    return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  }, []);

  const getProgressPercentage = useCallback((): number => {
    const currentLevelThreshold = LEVEL_THRESHOLDS[progress.level - 1] || 0;
    const nextLevelThreshold = LEVEL_THRESHOLDS[progress.level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1000;
    const xpInCurrentLevel = progress.totalXP - currentLevelThreshold;
    const xpNeededForLevel = nextLevelThreshold - currentLevelThreshold;
    return Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100);
  }, [progress]);

  return {
    progress,
    recentXPEvents,
    newBadge,
    awardXP,
    addSourceExplored,
    getLevelTitle,
    getProgressPercentage,
    trackAssistantUsed,
  };
};
