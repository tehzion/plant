// Gamification System Types - Based on Social Exchange Theory (SET)
// Rewards foster competence and autonomy, not just cosmetic achievements

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
  category: 'verification' | 'learning' | 'sharing' | 'engagement';
  xpReward: number;
  unlockedAt?: Date;
  progress?: number; // 0-100 for badges with progress tracking
  requirement: {
    type: 'facts_verified' | 'questions_asked' | 'truth_cards_shared' | 'streak_days' | 'sources_explored' | 'assistants_tried';
    count: number;
  };
}

export interface UserProgress {
  id: string;
  level: number;
  currentXP: number;
  totalXP: number;
  xpToNextLevel: number;
  factsVerified: number;
  questionsAsked: number;
  truthCardsShared: number;
  currentStreak: number;
  longestStreak: number;
  sourcesExplored: string[];
  assistantsTried: string[]; // Track which assistants user has tried
  badges: Badge[];
  unlockedBadgeIds: string[];
}

export interface XPEvent {
  type: 'question_asked' | 'fact_verified' | 'source_explored' | 'truth_card_created' | 'truth_card_shared' | 'daily_login';
  xpAmount: number;
  description: string;
  timestamp: Date;
}

// XP calculation based on SET - meaningful actions get more XP
export const XP_VALUES: Record<XPEvent['type'], number> = {
  question_asked: 10,      // Encourages curiosity
  fact_verified: 25,       // Rewards critical thinking
  source_explored: 15,     // Promotes deep learning
  truth_card_created: 20,  // Rewards synthesis
  truth_card_shared: 30,   // Encourages community benefit
  daily_login: 5,          // Light engagement reward
};

// Level thresholds - exponential growth encourages sustained engagement
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  850,    // Level 5
  1300,   // Level 6
  1900,   // Level 7
  2700,   // Level 8
  3700,   // Level 9
  5000,   // Level 10 (Myth Buster Master)
];

export const LEVEL_TITLES = [
  'Curious Explorer',
  'Fact Finder',
  'Truth Seeker',
  'Knowledge Builder',
  'Myth Challenger',
  'Evidence Expert',
  'Science Advocate',
  'Critical Thinker',
  'Truth Guardian',
  'Myth Buster Master',
];

// Badge definitions
export const BADGE_DEFINITIONS: Omit<Badge, 'unlockedAt' | 'progress'>[] = [
  {
    id: 'first_question',
    name: 'Curious Mind',
    description: 'Asked your first question. Every journey starts with curiosity.',
    icon: '🌱',
    tier: 'bronze',
    category: 'engagement',
    xpReward: 50,
    requirement: { type: 'questions_asked', count: 1 },
  },
  {
    id: 'five_questions',
    name: 'Questioner',
    description: 'Asked 5 questions. You are exploring different health topics!',
    icon: '❓',
    tier: 'bronze',
    category: 'engagement',
    xpReward: 75,
    requirement: { type: 'questions_asked', count: 5 },
  },
  {
    id: 'assistant_explorer',
    name: 'Assistant Explorer',
    description: 'Tried all 3 health assistants.  You know who to ask for what!',
    icon: '🎯',
    tier: 'silver',
    category: 'engagement',
    xpReward: 150,
    requirement: { type: 'assistants_tried', count: 3 },
  },
  {
    id: 'first_share',
    name: 'Community Voice',
    description: 'Shared the app with others! You are helping to spread the truth.',
    icon: '📢',
    tier: 'bronze',
    category: 'sharing',
    xpReward: 50,
    requirement: { type: 'truth_cards_shared', count: 1 },
  },
  {
    id: 'fact_checker_10',
    name: 'Fact Checker',
    description: 'Verified 10 facts. You are building strong critical thinking skills.',
    icon: '🔍',
    tier: 'bronze',
    category: 'verification',
    xpReward: 100,
    requirement: { type: 'facts_verified', count: 10 },
  },
  {
    id: 'myth_buster',
    name: 'Myth Buster',
    description: 'Verified 50 facts. You can now separate fact from fiction with confidence.',
    icon: '💪',
    tier: 'silver',
    category: 'verification',
    xpReward: 250,
    requirement: { type: 'facts_verified', count: 50 },
  },
  {
    id: 'truth_spreader',
    name: 'Truth Spreader',
    description: 'Shared 5 Truth Cards. You are helping others access reliable information.',
    icon: '📢',
    tier: 'silver',
    category: 'sharing',
    xpReward: 200,
    requirement: { type: 'truth_cards_shared', count: 5 },
  },
  {
    id: 'dedicated_learner',
    name: 'Dedicated Learner',
    description: 'Maintained a 7-day learning streak. Consistency builds knowledge.',
    icon: '🔥',
    tier: 'silver',
    category: 'engagement',
    xpReward: 150,
    requirement: { type: 'streak_days', count: 7 },
  },
  {
    id: 'source_explorer',
    name: 'Source Explorer',
    description: 'Explored 5 different trusted sources. You understand the value of diverse evidence.',
    icon: '📚',
    tier: 'bronze',
    category: 'learning',
    xpReward: 75,
    requirement: { type: 'sources_explored', count: 5 },
  },
  {
    id: 'science_champion',
    name: 'Science Champion',
    description: 'Verified 100 facts. You are a true advocate for evidence-based thinking.',
    icon: '🏆',
    tier: 'gold',
    category: 'verification',
    xpReward: 500,
    requirement: { type: 'facts_verified', count: 100 },
  },
];
