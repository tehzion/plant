import React from 'react';
import { SourceReference } from '@/types/chat';
import { ExternalLink, Building2, Heart, Globe, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const getSourceIcon = (type: SourceReference['type']) => {
  switch (type) {
    case 'CDC': return Building2;
    case 'NHS': return Heart;
    case 'WHO': return Globe;
    default: return Shield;
  }
};

const getSourceColor = (type: SourceReference['type']) => {
  switch (type) {
    case 'CDC': return 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
    case 'NHS': return 'bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300';
    case 'WHO': return 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300';
    default: return 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300';
  }
};

interface ExpandableSourceCardProps {
  source: SourceReference;
  onSourceClick?: (source: SourceReference) => void;
}

export const ExpandableSourceCard = React.forwardRef<HTMLDivElement, ExpandableSourceCardProps>(
  ({ source, onSourceClick }, ref) => {
    const SourceIcon = getSourceIcon(source.type);

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      window.open(source.url, '_blank', 'noopener,noreferrer');
      onSourceClick?.(source);
    };

    return (
      <div ref={ref}>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer group",
            getSourceColor(source.type)
          )}
        >
          <div className="shrink-0 w-8 h-8 rounded-md bg-current/10 flex items-center justify-center">
            <SourceIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{source.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-current/10 uppercase tracking-wide font-medium">
                {source.type}
              </span>
            </div>
            {source.excerpt && (
              <p className="mt-1 text-xs opacity-75 line-clamp-2 leading-relaxed">
                "{source.excerpt}"
              </p>
            )}
          </div>
          <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
        </a>
      </div>
    );
  }
);

ExpandableSourceCard.displayName = 'ExpandableSourceCard';