// Chat System Types

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: SourceReference[];
  isFactVerified?: boolean;
  redactedContent?: string; // For privacy-preserving sharing
  isStreaming?: boolean; // True while response is being streamed
  followUpQuestions?: string[]; // Suggested follow-up questions
}

export interface SourceReference {
  id: string;
  name: string;
  url: string;
  type: 'CDC' | 'NHS' | 'WHO';
  relevanceScore: number;
  excerpt?: string;
}

export interface TruthCard {
  id: string;
  title: string;
  claim: string;
  verdict: 'true' | 'false' | 'misleading' | 'needs_context';
  explanation: string;
  sources: SourceReference[];
  createdAt: Date;
  isRedacted: boolean;
  originalMessageIds: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  truthCards: TruthCard[];
}

// Privacy scrubbing patterns for common health-related PII
export const PRIVACY_PATTERNS = {
  names: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
  dates: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
  ages: /\b(?:my\s+)?(?:son|daughter|child|baby|kid)\s+is\s+\d+\s*(?:years?|months?|weeks?)?\s*old\b/gi,
  locations: /\b(?:in|from|at|near)\s+[A-Z][a-z]+(?:,?\s+[A-Z]{2})?\b/g,
  medicalIds: /\b[A-Z]{2,3}\d{6,10}\b/g,
  phoneNumbers: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
};

// Trusted sources for RAG system
export const TRUSTED_SOURCES = [
  { id: 'cdc', name: 'CDC', domain: 'cdc.gov', type: 'CDC' as const },
  { id: 'nhs', name: 'NHS', domain: 'nhs.uk', type: 'NHS' as const },
  { id: 'who', name: 'WHO', domain: 'who.int', type: 'WHO' as const },
];
