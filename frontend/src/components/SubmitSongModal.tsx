'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Music, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useSession } from 'next-auth/react';
import SelectPlaylistModal from './SelectPlaylistModal';

interface SubmitSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists?: Array<{ id: number; title: string }>;
  onSongSubmitted?: () => void;
  userPlaylistId?: number; // If provided, add directly to this playlist (don't show selector)
  playlistTitle?: string; // Title of the user playlist
}

interface SubmitResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Extract YouTube video ID from URL
const extractVideoId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1);
      } else {
        return urlObj.searchParams.get('v');
      }
    }
  } catch (e) {
    // Invalid URL
  }
  return null;
};

// Fetch video title from YouTube oEmbed API
const fetchYouTubeTitle = async (videoId: string): Promise<string | null> => {
  try {
    console.log(`📺 [SubmitSongModal] Fetching title for video ID: ${videoId}`);
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (response.ok) {
      const data = await response.json();
      const title = data.title;
      console.log(`✅ [SubmitSongModal] Fetched title: ${title}`);
      return title;
    } else {
      console.warn(`⚠️ [SubmitSongModal] Failed to fetch title, status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ [SubmitSongModal] Error fetching YouTube title:', error);
  }
  return null;
};

export default function SubmitSongModal({ isOpen, onClose, onSongSubmitted, userPlaylistId, playlistTitle }: SubmitSongModalProps) {
  const { data: session } = useSession();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(null);
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<SubmitResponse | null>(null);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [selectedSongTitle, setSelectedSongTitle] = useState('');
  const [selectedPlaylistName, setSelectedPlaylistName] = useState('');
  const [successFeedback, setSuccessFeedback] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Auto-focus URL input when modal opens
  useEffect(() => {
    if (isOpen && urlInputRef.current) {
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        console.log('⌨️ [SubmitSongModal] Escape pressed, closing modal');
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        console.log('⌨️ [SubmitSongModal] Cmd+Enter pressed, submitting form');
        const form = document.querySelector('form[data-submit-song-form]') as HTMLFormElement;
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true }));
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleUrlChange = async (url: string) => {
    setYoutubeUrl(url);
    setFetchedTitle(null);
    setResponse(null);

    // Auto-fetch title when valid URL is pasted
    if (url.trim()) {
      const videoId = extractVideoId(url);
      if (videoId) {
        setIsFetchingTitle(true);
        const title = await fetchYouTubeTitle(videoId);
        setIsFetchingTitle(false);
        if (title) {
          setFetchedTitle(title);
        } else {
          setResponse({
            success: false,
            message: '',
            error: 'Could not fetch song title from YouTube. Please check the URL.',
          });
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!youtubeUrl.trim()) {
      setResponse({ success: false, message: '', error: 'Please enter a YouTube URL' });
      return;
    }

    if (!fetchedTitle) {
      setResponse({ success: false, message: '', error: 'Could not retrieve song title. Please verify the YouTube URL.' });
      return;
    }

    if (!session?.user) {
      setResponse({ success: false, message: '', error: 'Please sign in to submit songs' });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      console.log(`🎵 [SubmitSongModal] Submitting song: "${fetchedTitle}"`);
      console.log(`📋 [SubmitSongModal] Target playlist - ID: ${userPlaylistId || 'default'}, Title: ${playlistTitle || 'Default Music'}`);
      
      const res = await fetch(`${API_BASE_URL}/api/user-songs/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any).accessToken || ''}`,
        },
        body: JSON.stringify({
          song_name: fetchedTitle,
          youtube_url: youtubeUrl,
          playlist_id: userPlaylistId || null,
        }),
      });

      const data: SubmitResponse = await res.json();
      console.log('🎵 [SubmitSongModal] Submit response:', data);
      setResponse(data);

      if (data.success) {
        console.log('✅ [SubmitSongModal] Song submitted successfully');
        setSelectedSongTitle(fetchedTitle || 'Unknown Song');
        setSelectedPlaylistName(playlistTitle || 'Default Music');
        setYoutubeUrl('');
        setFetchedTitle(null);
        setSuccessFeedback(true);
        
        // If this is a user playlist, add directly without asking
        if (userPlaylistId) {
          console.log(`📋 [SubmitSongModal] Direct add to user playlist ID: ${userPlaylistId}`);
          setTimeout(() => {
            console.log('📢 [SubmitSongModal] Calling onSongSubmitted callback after 1.5s...');
            onClose();
            if (onSongSubmitted) {
              onSongSubmitted();
            }
          }, 1500);
        } else {
          // Show playlist selector for default/Linus Playlist
          setTimeout(() => {
            setShowPlaylistSelector(true);
            setResponse(null);
          }, 500);
        }
      } else {
        console.warn('❌ [SubmitSongModal] Song submission failed:', data.error);
        setSuccessFeedback(false);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to submit song';
      console.error('❌ [SubmitSongModal] Error submitting song:', errorMsg);
      setSuccessFeedback(false);
      setResponse({
        success: false,
        message: '',
        error: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaylistSelected = (playlistId: number | null, playlistTitle?: string) => {
    console.log(`📋 [SubmitSongModal] Playlist selected: ${playlistTitle} (ID: ${playlistId})`);
    setSelectedPlaylistName(playlistTitle || 'Default Playlist');
    setShowPlaylistSelector(false);
    setSuccessFeedback(true);
    
    // Close the entire modal after playlist selection
    setTimeout(() => {
      console.log('📢 [SubmitSongModal] Calling onSongSubmitted callback...');
      onClose();
      if (onSongSubmitted) {
        onSongSubmitted();
      }
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Add YouTube Song</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" data-submit-song-form>
          {/* Info */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              Paste a YouTube link and we'll automatically fetch the song title.
            </p>
            <p className="text-xs text-gray-500">
              💡 Tip: Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">⌘ Enter</kbd> to submit,{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Esc</kbd> to close
            </p>
          </div>

          {/* YouTube URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              YouTube URL
            </label>
            <input
              ref={urlInputRef}
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={isLoading || isFetchingTitle}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              required
            />
          </div>

          {/* Fetched Title Display */}
          {isFetchingTitle && (
            <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Loader className="w-4 h-4 text-blue-400 animate-spin" />
              <p className="text-sm text-blue-300">Fetching song title...</p>
            </div>
          )}

          {fetchedTitle && !isFetchingTitle && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-xs text-green-300 font-medium mb-1">Song Title</p>
              <p className="text-sm text-green-200 font-semibold truncate">{fetchedTitle}</p>
            </div>
          )}

          {/* Response Messages */}
          {response && (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg ${
                response.success
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}
            >
              {response.success ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    response.success ? 'text-green-300' : 'text-red-300'
                  }`}
                >
                  {response.message || response.error}
                </p>
              </div>
            </div>
          )}

          {/* Success Feedback */}
          {successFeedback && response?.success && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30 animate-in">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-300">Song Added Successfully! 🎵</p>
                <p className="text-xs text-green-200 mt-1">
                  <span className="font-semibold">{selectedSongTitle}</span>
                  {selectedPlaylistName && (
                    <>
                      <br />
                      Added to: <span className="font-semibold">{selectedPlaylistName}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !youtubeUrl.trim() || !fetchedTitle || isFetchingTitle}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Music className="w-4 h-4" />
                Add to My Playlist
              </>
            )}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-all"
          >
            Cancel
          </button>
        </form>
      </div>

      {/* Playlist Selection Modal */}
      <SelectPlaylistModal
        isOpen={showPlaylistSelector}
        onClose={() => setShowPlaylistSelector(false)}
        onSelectPlaylist={handlePlaylistSelected}
        songTitle={selectedSongTitle}
      />
    </div>
  );
}

