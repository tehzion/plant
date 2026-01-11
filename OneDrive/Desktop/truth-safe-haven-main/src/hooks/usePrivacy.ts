import { useCallback } from 'react';
import { ChatMessage, TruthCard, PRIVACY_PATTERNS, SourceReference } from '@/types/chat';

export const usePrivacy = () => {
  // Scrub personally identifiable information from text
  const scrubPII = useCallback((text: string): string => {
    let scrubbedText = text;
    
    // Replace names with [Name]
    scrubbedText = scrubbedText.replace(PRIVACY_PATTERNS.names, '[Name]');
    
    // Replace dates with [Date]
    scrubbedText = scrubbedText.replace(PRIVACY_PATTERNS.dates, '[Date]');
    
    // Replace age references with generic terms
    scrubbedText = scrubbedText.replace(PRIVACY_PATTERNS.ages, 'my child');
    
    // Replace locations with [Location]
    scrubbedText = scrubbedText.replace(PRIVACY_PATTERNS.locations, 'in [Location]');
    
    // Replace medical IDs
    scrubbedText = scrubbedText.replace(PRIVACY_PATTERNS.medicalIds, '[ID]');
    
    // Replace phone numbers
    scrubbedText = scrubbedText.replace(PRIVACY_PATTERNS.phoneNumbers, '[Phone]');
    
    // Replace emails
    scrubbedText = scrubbedText.replace(PRIVACY_PATTERNS.emails, '[Email]');
    
    return scrubbedText;
  }, []);

  // Create a privacy-scrubbed version of messages
  const scrubMessages = useCallback((messages: ChatMessage[]): ChatMessage[] => {
    return messages.map(msg => ({
      ...msg,
      redactedContent: scrubPII(msg.content),
    }));
  }, [scrubPII]);

  // Generate a Truth Card from conversation
  const generateTruthCard = useCallback((
    claim: string,
    verdict: TruthCard['verdict'],
    explanation: string,
    sources: SourceReference[],
    originalMessageIds: string[],
    shouldRedact: boolean = true
  ): TruthCard => {
    return {
      id: `tc-${Date.now()}`,
      title: claim.length > 50 ? claim.substring(0, 47) + '...' : claim,
      claim: shouldRedact ? scrubPII(claim) : claim,
      verdict,
      explanation: shouldRedact ? scrubPII(explanation) : explanation,
      sources,
      createdAt: new Date(),
      isRedacted: shouldRedact,
      originalMessageIds,
    };
  }, [scrubPII]);

  // Get verdict display info
  const getVerdictInfo = useCallback((verdict: TruthCard['verdict']) => {
    switch (verdict) {
      case 'true':
        return { 
          label: 'Verified True', 
          color: 'bg-success text-success-foreground',
          icon: '✓'
        };
      case 'false':
        return { 
          label: 'False', 
          color: 'bg-destructive text-destructive-foreground',
          icon: '✗'
        };
      case 'misleading':
        return { 
          label: 'Misleading', 
          color: 'bg-badge-gold text-foreground',
          icon: '⚠'
        };
      case 'needs_context':
        return { 
          label: 'Needs Context', 
          color: 'bg-info text-info-foreground',
          icon: '?'
        };
    }
  }, []);

  // Generate shareable text for Truth Card
  const generateShareableText = useCallback((card: TruthCard): string => {
    const verdictInfo = getVerdictInfo(card.verdict);
    const sourcesText = card.sources.map(s => s.name).join(', ');
    
    return `${verdictInfo.icon} ${verdictInfo.label.toUpperCase()}

"${card.claim}"

${card.explanation}

Sources: ${sourcesText}

Verified with Vaccine Hunter - Fighting misinformation with facts.`;
  }, [getVerdictInfo]);

  return {
    scrubPII,
    scrubMessages,
    generateTruthCard,
    getVerdictInfo,
    generateShareableText,
  };
};
