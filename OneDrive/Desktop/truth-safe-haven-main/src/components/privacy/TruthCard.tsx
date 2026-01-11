import { TruthCard as TruthCardType, SourceReference } from '@/types/chat';
import { usePrivacy } from '@/hooks/usePrivacy';
import { Shield, ExternalLink, Link as LinkIcon, Check, Building2, Heart, Globe, BookOpen, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TruthCardProps {
  card: TruthCardType;
  onShare?: () => void;
  className?: string;
}

const getSourceIcon = (type: SourceReference['type']) => {
  switch (type) {
    case 'CDC':
      return <Building2 className="w-4 h-4" />;
    case 'NHS':
      return <Heart className="w-4 h-4" />;
    case 'WHO':
      return <Globe className="w-4 h-4" />;
    default:
      return <ExternalLink className="w-4 h-4" />;
  }
};


export const TruthCard = ({ card, onShare, className }: TruthCardProps) => {
  const { getVerdictInfo } = usePrivacy();
  const [copied, setCopied] = useState(false);

  const verdictInfo = getVerdictInfo(card.verdict);

  const handleShareLink = async () => {
    const shareData = {
      claim: card.claim,
      verdict: card.verdict,
      explanation: card.explanation,
      sources: card.sources.map(s => ({ id: s.id, name: s.name, url: s.url, type: s.type, excerpt: s.excerpt })),
    };

    const encoded = btoa(JSON.stringify(shareData));
    const shareUrl = `${window.location.origin}/share/${encoded}`;

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Share link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
    onShare?.();
  };

  return (
    <div className={cn("truth-card text-primary-foreground", className)}>
      {/* Pattern overlay */}
      <div className="truth-card-pattern" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">Truth Card</span>
        </div>

        {/* Verdict badge */}
        <div className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-4",
          verdictInfo.color
        )}>
          <span>{verdictInfo.icon}</span>
          <span>{verdictInfo.label}</span>
        </div>

        {/* Claim with decorative quotes */}
        <div className="relative mb-4">
          <span className="absolute -left-1 -top-2 text-4xl text-primary-foreground/20 font-serif">"</span>
          <blockquote className="text-base sm:text-lg font-medium italic pl-4 pr-2 py-2 
                                 bg-primary-foreground/5 border-l-2 border-primary-foreground/30 rounded-r">
            {card.claim}
          </blockquote>
          <span className="absolute -right-1 bottom-0 text-4xl text-primary-foreground/20 font-serif">"</span>
        </div>

        {/* AI Answer - Full Response */}
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wide mb-2 opacity-70 font-semibold">Answer:</p>
          <p className="text-xs sm:text-sm opacity-90 leading-relaxed whitespace-pre-wrap">
            {card.explanation}
          </p>
        </div>

        {/* Sources - Redesigned as cards */}
        <div className="border-t border-primary-foreground/20 pt-4 mb-4">
          <p className="text-xs uppercase tracking-wide mb-3 opacity-70 font-semibold">Verified Sources</p>
          <div className="space-y-2">
            {card.sources.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-primary-foreground/10 hover:bg-primary-foreground/20 
                         rounded-lg p-3 transition-all duration-200 group"
              >
                {/* Source header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary-foreground/20">
                      {getSourceIcon(source.type)}
                    </div>
                    <div>
                      <span className="text-sm font-medium block">{source.name}</span>
                      <span className="text-xs opacity-60">{source.type}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Excerpt */}
                {source.excerpt && (
                  <p className="text-xs opacity-80 leading-relaxed pl-9 italic">
                    "{source.excerpt}"
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleShareLink}
            variant="secondary"
            size="sm"
            className="flex-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 
                     text-primary-foreground border-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Link Copied!
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4 mr-2" />
                Share Link
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
