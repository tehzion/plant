import { SourceReference } from '@/types/chat';
import { TRUSTED_SOURCES_DB, TrustedSourceEntry } from './trusted-sources-db';

/**
 * Match sources to content based on keyword analysis
 * Analyzes both the user query and AI response to find relevant trusted sources
 */
export function matchSourcesToContent(
  userQuery: string,
  aiResponse: string,
  maxSources: number = 4
): SourceReference[] {
  const combinedText = `${userQuery} ${aiResponse}`.toLowerCase();
  
  // Score each source based on keyword matches
  const scoredSources = TRUSTED_SOURCES_DB.map(source => {
    const score = calculateRelevanceScore(source, combinedText, userQuery.toLowerCase());
    return { source, score };
  });
  
  // Filter sources with meaningful scores and sort by relevance
  const relevantSources = scoredSources
    .filter(({ score }) => score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSources);
  
  // Convert to SourceReference format
  return relevantSources.map(({ source, score }) => ({
    id: source.id,
    name: source.name,
    url: source.url,
    type: source.type,
    relevanceScore: Math.min(score, 1.0),
    excerpt: source.excerpt
  }));
}

/**
 * Calculate relevance score for a source based on keyword matches
 */
function calculateRelevanceScore(
  source: TrustedSourceEntry,
  combinedText: string,
  userQuery: string
): number {
  let score = 0;
  let matchedKeywords = 0;
  
  for (const keyword of source.keywords) {
    const keywordLower = keyword.toLowerCase();
    
    // Higher weight for matches in user query
    if (userQuery.includes(keywordLower)) {
      score += 0.25;
      matchedKeywords++;
    }
    
    // Count occurrences in combined text
    const regex = new RegExp(`\\b${escapeRegex(keywordLower)}\\b`, 'gi');
    const matches = combinedText.match(regex);
    if (matches) {
      score += 0.1 * Math.min(matches.length, 3); // Cap at 3 occurrences
      matchedKeywords++;
    }
  }
  
  // Bonus for multiple keyword matches
  if (matchedKeywords >= 3) {
    score *= 1.2;
  }
  
  // Normalize score (rough normalization based on keyword count)
  const normalizedScore = score / (source.keywords.length * 0.3);
  
  return Math.min(normalizedScore, 1.0);
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
