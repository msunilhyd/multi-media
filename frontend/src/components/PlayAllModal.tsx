'use client';

import { useState, useEffect, useRef } from 'react';
import { X, SkipForward, PlayCircle, Home, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

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

  const handleGoBack = () => {
    console.log('🔙 [PlayAllModal] Going back to football page');
    onClose();
  };

  const handleGoHome = () => {
    console.log('🏠 [PlayAllModal] Going to homepage');
    onClose();
    setTimeout(() => {
      router.push('/');
    }, 300);
  };

  if (!isOpen || !currentHighlight) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={handleShowControls}
      onTouchStart={handleShowControls}
    >
      {/* Always-Visible Top Navigation Bar - Mobile Friendly */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black via-black/80 to-transparent p-3 sm:p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Back Button - Always Visible */}
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm sm:text-base"
            aria-label="Go back to football page"
            title="Go back (or press Escape)"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Title/League Info */}
          <div className="flex-1 text-center px-4">
            <p className="text-white text-sm sm:text-base font-semibold line-clamp-1">
              {leagueName} Highlights
            </p>
          </div>

          {/* Home & Close Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoHome}
              className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              aria-label="Go to homepage"
              title="Go to homepage"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={handleGoBack}
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              aria-label="Close video player"
              title="Close (or press Escape)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Original Close Button - Hidden on Mobile, Visible on Desktop when hovering video */}

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
