'use client';

import { Highlight } from '@/lib/api';
import VideoCard from './VideoCard';

interface HighlightsGridProps {
  highlights: Highlight[];
  showMatchInfo?: boolean;
}

export default function HighlightsGrid({ highlights, showMatchInfo = false }: HighlightsGridProps) {
  if (!highlights || highlights.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">No highlights available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {highlights.map((highlight) => (
        <VideoCard
          key={highlight.id}
          highlight={highlight}
          showMatchInfo={showMatchInfo}
        />
      ))}
    </div>
  );
}
