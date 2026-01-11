import { SourceReference } from '@/types/chat';
import { VACCINE_KNOWLEDGE_BASE, FALLBACK_RESPONSE, KnowledgeEntry } from './vaccine-knowledge-base';
import { ChatMessage } from './ai-service';
import type { AIMode } from '@/hooks/useAvatarPreference';

// Mode-specific preambles
const MODE_PREAMBLES: Record<AIMode, string[]> = {
  factcheck: [
    "Let me verify this for you. ",
    "Based on available evidence: ",
    "After checking trusted sources: ",
    "Here's what the research shows: ",
  ],
  consultation: [
    "I understand you're looking for guidance. ",
    "Thank you for asking about this. ",
    "Let me explain this clearly. ",
    "Here's what you should know: ",
  ],
  mental: [
    "I hear you, and I'm here to help. ",
    "Thank you for sharing that with me. ",
    "It's completely okay to feel this way. ",
    "I appreciate you opening up. ",
    "Your feelings are valid. ",
  ],
};

/**
 * Find the best matching knowledge entry for a user query
 */
function findBestMatch(query: string): KnowledgeEntry {
  const lowerQuery = query.toLowerCase();
  
  // Score each entry based on keyword matches
  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of VACCINE_KNOWLEDGE_BASE) {
    let score = 0;
    
    for (const keyword of entry.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        // Longer keywords get more weight
        score += keyword.length;
        
        // Exact word match gets bonus
        const wordBoundary = new RegExp(`\\b${keyword.toLowerCase()}\\b`);
        if (wordBoundary.test(lowerQuery)) {
          score += 5;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  // Return fallback if no good match found
  return bestMatch && bestScore >= 3 ? bestMatch : FALLBACK_RESPONSE;
}

/**
 * Get a mode-appropriate preamble
 */
function getModePreamble(mode: AIMode): string {
  // 60% chance of adding a preamble
  if (Math.random() > 0.6) return '';
  const preambles = MODE_PREAMBLES[mode];
  return preambles[Math.floor(Math.random() * preambles.length)];
}

/**
 * Delay helper for simulating typing
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Stream tokens with realistic variable delays
 */
async function streamTokens(
  text: string,
  onToken: (token: string) => void
): Promise<void> {
  const words = text.split(' ');
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Variable delay between 25-70ms per word
    // Slightly longer delays after punctuation for natural pacing
    let delayMs = 25 + Math.random() * 45;
    
    if (word.endsWith('.') || word.endsWith('?') || word.endsWith(':')) {
      delayMs += 50;
    }
    if (word.endsWith('\n\n')) {
      delayMs += 80;
    }
    
    await delay(delayMs);
    
    // Add space after word unless it's the last word
    const token = i < words.length - 1 ? word + ' ' : word;
    onToken(token);
  }
}

/**
 * Main mock streaming function that simulates realistic AI response streaming
 */
export async function mockStreamResponse(
  messages: ChatMessage[],
  mode: AIMode,
  onToken: (token: string) => void,
  onComplete: (sources: SourceReference[], followUpQuestions: string[]) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    // Get the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    if (!lastUserMessage) {
      throw new Error('No user message found');
    }

    // Find matching knowledge entry
    const entry = findBestMatch(lastUserMessage.content);
    
    // Build response with mode-appropriate preamble
    const preamble = getModePreamble(mode);
    
    // If adding preamble, check if response already starts similarly
    let fullResponse = entry.response;
    if (preamble && !entry.response.toLowerCase().startsWith('i understand') && 
        !entry.response.toLowerCase().startsWith('thank you') &&
        !entry.response.toLowerCase().startsWith('that\'s') &&
        !entry.response.toLowerCase().startsWith('let me') &&
        !entry.response.toLowerCase().startsWith('based on')) {
      fullResponse = preamble + entry.response;
    }

    // Initial "thinking" delay (simulates API latency)
    await delay(300 + Math.random() * 400);

    // Stream the response
    await streamTokens(fullResponse, onToken);

    // Small delay before completing
    await delay(100);

    // Complete with sources and follow-up questions
    onComplete(entry.sources, entry.followUpQuestions);
    
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Mock AI error'));
  }
}
