'use client';

import { useState, useEffect, useRef } from 'react';
import { X, SkipForward, PlayCircle } from 'lucide-react';
import { Highlight } from '@/lib/api';

interface PlayAllModalProps {
  highlights: (Highlight & { matchInfo?: string })[];
  isOpen: boolean;
  onClose: () => void;
  leagueName: string;
}

export default function PlayAllModal({ highlights, isOpen, onClose, leagueName }: PlayAllModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);

  const currentHighlight = highlights[currentIndex];
  const hasNext = currentIndex < highlights.length - 1;

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setShowControls(true);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleShowControls = () => {
    setShowControls(true);
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(prev => prev + 1);
      setShowControls(true);
    }
  };

  const handleVideoSelect = (index: number) => {
    setCurrentIndex(index);
    setShowControls(true);
  };

  if (!isOpen || !currentHighlight) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={handleShowControls}
      onTouchStart={handleShowControls}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className={`absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Close"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Video Player */}
      <div className="w-full h-full flex items-center justify-center">
        <iframe
          ref={playerRef}
          src={`https://www.youtube.com/embed/${currentHighlight.youtube_video_id}?autoplay=1&rel=0&modestbranding=1`}
          title={currentHighlight.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Bottom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4 transition-all ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
        }`}
      >
        {/* Current Video Info */}
        <div className="max-w-7xl mx-auto mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg mb-1 line-clamp-1">
                {currentHighlight.matchInfo || currentHighlight.title}
              </h3>
              <p className="text-gray-300 text-sm">
                {leagueName} • Video {currentIndex + 1} of {highlights.length}
              </p>
            </div>
            {hasNext && (
              <button
                onClick={handleNext}
                className="ml-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <SkipForward className="w-5 h-5" />
                Next
              </button>
            )}
          </div>

          {/* Video Queue - Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {highlights.map((highlight, index) => (
              <button
                key={highlight.id}
                onClick={() => handleVideoSelect(index)}
                className={`flex-shrink-0 w-40 rounded-lg overflow-hidden transition-all ${
                  index === currentIndex
                    ? 'ring-2 ring-blue-500 scale-105'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <div className="relative aspect-video">
                  <img
                    src={highlight.thumbnail_url || `https://img.youtube.com/vi/${highlight.youtube_video_id}/hqdefault.jpg`}
                    alt={highlight.matchInfo || highlight.title}
                    className="w-full h-full object-cover"
                  />
                  {index === currentIndex && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 bg-black/80 text-white text-xs px-1 rounded">
                    {index + 1}
                  </div>
                </div>
                <div className="bg-gray-800 p-1">
                  <p className="text-white text-xs line-clamp-1">
                    {highlight.matchInfo || highlight.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
