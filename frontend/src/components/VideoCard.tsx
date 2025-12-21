'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Eye, Clock, CheckCircle, X } from 'lucide-react';
import { Highlight } from '@/lib/api';

interface VideoCardProps {
  highlight: Highlight & { matchInfo?: string };
  showMatchInfo?: boolean;
}

export default function VideoCard({ highlight, showMatchInfo = false }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { youtube_video_id, title, thumbnail_url, channel_title, view_count, duration, is_official, matchInfo } = highlight;

  const formatViewCount = (count: number | null) => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const thumbnailSrc = thumbnail_url || `https://img.youtube.com/vi/${youtube_video_id}/hqdefault.jpg`;

  const handlePlay = async () => {
    setIsPlaying(true);
    // Wait for iframe to render, then request fullscreen
    setTimeout(async () => {
      const container = containerRef.current;
      if (container) {
        try {
          if (container.requestFullscreen) {
            await container.requestFullscreen();
          } else if ((container as any).webkitRequestFullscreen) {
            await (container as any).webkitRequestFullscreen();
          } else if ((container as any).msRequestFullscreen) {
            await (container as any).msRequestFullscreen();
          }
        } catch (err) {
          console.log('Fullscreen not supported or denied');
        }
      }
    }, 100);
  };

  // Handle fullscreen exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        setIsPlaying(false);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleClose = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if ((document as any).webkitFullscreenElement) {
        await (document as any).webkitExitFullscreen();
      }
    } catch (err) {
      console.log('Could not exit fullscreen');
    }
    setIsPlaying(false);
  };

  // Show controls on mouse/touch movement, hide after 3 seconds
  const handleShowControls = useCallback(() => {
    setShowControls(true);
    
    // Clear existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    // Hide controls after 3 seconds of no movement
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Fullscreen video container
  if (isPlaying) {
    return (
      <>
        <div 
          ref={containerRef}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        >
          {/* Transparent overlay to capture mouse events over iframe */}
          <div 
            className="absolute inset-0 z-[55]"
            onMouseMove={handleShowControls}
            onTouchStart={handleShowControls}
            onClick={handleShowControls}
            style={{ pointerEvents: showControls ? 'none' : 'auto' }}
          />
          
          {/* Close button - shown on mouse/touch activity */}
          <button
            onClick={handleClose}
            className={`absolute top-4 right-4 z-[60] bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all shadow-lg ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-label="Close video"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Hint text for desktop users - shown on mouse activity */}
          <div className={`absolute top-4 left-4 z-[60] bg-black/70 text-white/80 px-3 py-2 rounded-lg text-sm hidden sm:block transition-opacity ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}>
            Press <kbd className="bg-white/20 px-2 py-0.5 rounded mx-1">ESC</kbd> or tap <X className="w-4 h-4 inline" /> to close
          </div>
          
          {/* Hint text for mobile users - shown on touch activity */}
          <div className={`absolute top-4 left-4 z-[60] bg-black/70 text-white/80 px-3 py-2 rounded-lg text-sm sm:hidden transition-opacity ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}>
            Tap <X className="w-4 h-4 inline" /> to close
          </div>
          
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${youtube_video_id}?autoplay=1&rel=0&fs=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </>
    );
  }

  return (
    <div 
      className="group cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow bg-white dark:bg-gray-800"
      onClick={handlePlay}
    >
      <div className="relative aspect-video">
        <img
          src={thumbnailSrc}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>
        {duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {duration}
          </div>
        )}
        {is_official && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Official
          </div>
        )}
      </div>
      <div className="p-3">
        {showMatchInfo && matchInfo && (
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
            {matchInfo}
          </p>
        )}
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
          {title}
        </h3>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">{channel_title}</span>
          {view_count && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatViewCount(view_count)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
