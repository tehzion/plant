import { useParams, Link } from 'react-router-dom';
import { TruthCard } from '@/components/privacy/TruthCard';
import { TruthCard as TruthCardType } from '@/types/chat';
import { Shield, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

const ShareCard = () => {
  const { cardData } = useParams<{ cardData: string }>();

  const card = useMemo<TruthCardType | null>(() => {
    if (!cardData) return null;
    
    try {
      const decoded = atob(cardData);
      const parsed = JSON.parse(decoded);
      
      return {
        id: 'shared-card',
        title: 'Shared Truth Card',
        claim: parsed.claim || '',
        verdict: parsed.verdict || 'needs_context',
        explanation: parsed.explanation || '',
        sources: parsed.sources || [],
        createdAt: new Date(),
        isRedacted: false,
        originalMessageIds: [],
      };
    } catch {
      return null;
    }
  }, [cardData]);

  if (!card) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Share Link</h1>
          <p className="text-muted-foreground mb-6">This Truth Card link appears to be invalid or corrupted.</p>
          <Button asChild>
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Go to Vaccine Hunter
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <Shield className="w-6 h-6" />
            <span className="font-bold text-lg">Vaccine Hunter</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <TruthCard card={card} className="shadow-xl" />
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="border-t border-border p-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">
            Verify health claims with trusted sources
          </p>
          <Button asChild size="lg">
            <Link to="/">
              Try Vaccine Hunter
            </Link>
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default ShareCard;
