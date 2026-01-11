import { useState } from 'react';
import { usePrivacy } from '@/hooks/usePrivacy';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface PrivacyScrubberProps {
  originalText: string;
  onConfirm: (scrubbedText: string, isRedacted: boolean) => void;
  onCancel: () => void;
}

export const PrivacyScrubber = ({ originalText, onConfirm, onCancel }: PrivacyScrubberProps) => {
  const { scrubPII } = usePrivacy();
  const [showOriginal, setShowOriginal] = useState(false);
  const [isRedacting, setIsRedacting] = useState(true);
  
  const scrubbedText = scrubPII(originalText);
  const hasChanges = originalText !== scrubbedText;

  return (
    <div className="bg-card rounded-xl border border-border p-5 animate-scale-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground font-display">Privacy Protection</h3>
          <p className="text-sm text-muted-foreground">
            Review what will be shared
          </p>
        </div>
      </div>
      
      {/* Privacy toggle */}
      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Remove personal details</span>
          {hasChanges && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Recommended
            </span>
          )}
        </div>
        <Switch
          checked={isRedacting}
          onCheckedChange={setIsRedacting}
          aria-label="Toggle privacy protection"
        />
      </div>
      
      {/* Preview */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Preview</span>
          {isRedacting && hasChanges && (
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showOriginal ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  Hide original
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  Show original
                </>
              )}
            </button>
          )}
        </div>
        
        <div className={cn(
          "p-4 rounded-lg text-sm leading-relaxed",
          isRedacting ? "bg-accent/50" : "bg-secondary/50"
        )}>
          {isRedacting ? scrubbedText : originalText}
        </div>
        
        {showOriginal && isRedacting && hasChanges && (
          <div className="mt-2 p-4 bg-muted rounded-lg text-sm leading-relaxed">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Original (not shared)
            </p>
            <span className="text-muted-foreground">{originalText}</span>
          </div>
        )}
      </div>
      
      {/* Info notice */}
      {hasChanges && isRedacting && (
        <div className="flex items-start gap-2 p-3 bg-info/10 rounded-lg text-sm text-info mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Personal details like names, dates, and locations have been replaced with placeholders to protect your privacy.
          </p>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(isRedacting ? scrubbedText : originalText, isRedacting)}
          className="flex-1"
        >
          Create Truth Card
        </Button>
      </div>
    </div>
  );
};
