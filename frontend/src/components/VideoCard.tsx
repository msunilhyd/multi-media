'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Eye, Clock, CheckCircle, X, Calendar, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Highlight } from '@/lib/api';

interface VideoCardProps {
  highlight: Highlight & { matchInfo?: string; matchDate?: string; matchTime?: string | null };
  showMatchInfo?: boolean;
}

export default function VideoCard({ highlight, showMatchInfo = false }: VideoCardProps) {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { youtube_video_id, title, thumbnail_url, channel_title, view_count, duration, is_official, matchInfo, matchDate, matchTime, is_geo_blocked, blocked_countries, allowed_countries } = highlight;

  const formatViewCount = (count: number | null) => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatMatchDateTime = (dateStr: string | null, timeStr: string | null) => {
    if (!dateStr) return null;
    try {
      // Parse the date string (YYYY-MM-DD format)
      const dateParts = dateStr.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
      const day = parseInt(dateParts[2]);
      
      // Create date object
      let matchDateTime;
      
      if (timeStr) {
        // Parse time (e.g., "14:30" or "14:30:00")
        const timeParts = timeStr.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        // Create date in UTC (assuming the match time from API is in UTC)
        matchDateTime = new Date(Date.UTC(year, month, day, hours, minutes));
      } else {
        // If no time provided, just use the date at noon UTC
        matchDateTime = new Date(Date.UTC(year, month, day, 12, 0));
      }
      
      // Format to user's local timezone
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const matchDate = new Date(matchDateTime.getFullYear(), matchDateTime.getMonth(), matchDateTime.getDate());
      
      const timeString = matchDateTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      // Show date if not today
      if (matchDate.getTime() !== today.getTime()) {
        const dateString = matchDateTime.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        });
        return timeStr ? `${dateString}, ${timeString}` : dateString;
      }
      
      return timeStr ? timeString : 'Today';
    } catch {
      return null;
    }
  };

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

  const handleClose = useCallback(async () => {
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
  }, []);

  // Handle fullscreen exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        setIsPlaying(false);
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPlaying && e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, handleClose]);

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
          
          {/* Top Control Bar - Always visible */}
          <div className={`absolute top-0 left-0 right-0 z-[60] bg-gradient-to-b from-black/70 to-transparent p-4 flex items-center justify-between transition-opacity ${
            showControls || true ? 'opacity-100' : 'opacity-0'
          }`}>
            {/* Hint text for mobile users */}
            <div className={`text-white/70 text-xs px-2 py-1 rounded-lg sm:hidden`}>
              Tap controls to manage playback
            </div>
            
            {/* Back button */}
            <button
              onClick={handleClose}
              className="absolute left-4 top-4 z-[70] bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all shadow-lg flex items-center justify-center"
              aria-label="Go back"
              title="Go back to highlights"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className={`absolute right-4 top-4 z-[70] bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-all shadow-lg flex items-center justify-center`}
              aria-label="Close video"
              title="Close video (ESC or tap)"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Hint text for desktop users */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 text-white/70 text-xs px-3 py-1 rounded-lg hidden sm:block`}>
              Press <kbd className="bg-white/20 px-2 py-0.5 rounded mx-1">ESC</kbd> to close
            </div>
          </div>
          
          {/* Bottom Control Bar - Mobile only */}
          <div className="absolute bottom-0 left-0 right-0 z-[60] bg-gradient-to-t from-black/70 to-transparent p-4 sm:hidden flex items-center justify-center gap-2">
            <button
              onClick={handleClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg flex items-center gap-2"
              title="Go back to highlights"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <Link
              href="/"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg"
              title="Go to home page"
            >
              Home
            </Link>
          </div>
          
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${youtube_video_id}?autoplay=1&mute=0&rel=0&fs=1&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="w-full h-full relative z-[51]"
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
      <div className="relative aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center gap-3">
          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
          <p className="text-white/80 text-xs font-medium leading-snug line-clamp-2 max-w-[90%]">{title}</p>
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
        {is_geo_blocked && (
          <div className="absolute top-2 right-2 bg-amber-500/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Region Restricted
          </div>
        )}
      </div>
      <div className="p-3">
        {showMatchInfo && matchInfo && (
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {matchInfo}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span className="truncate">{channel_title}</span>
          {view_count && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatViewCount(view_count)}
            </span>
          )}
        </div>
        {(matchDate || matchTime) && (
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <Calendar className="w-3 h-3" />
            {formatMatchDateTime(matchDate || null, matchTime || null)}
          </div>
        )}
      </div>
    </div>
  );
}
