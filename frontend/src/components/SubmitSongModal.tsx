'use client';

import { useState } from 'react';
import { X, Music, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface SubmitSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists?: Array<{ id: number; title: string }>;
  onSongSubmitted?: () => void;
}

interface SubmitResponse {
  success: boolean;
  message: string;
  error?: string;
}

export default function SubmitSongModal({ isOpen, onClose, onSongSubmitted }: SubmitSongModalProps) {
  const { data: session } = useSession();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<SubmitResponse | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!youtubeUrl.trim()) {
      setResponse({ success: false, message: '', error: 'Please enter a YouTube URL' });
      return;
    }

    if (!session?.user) {
      setResponse({ success: false, message: '', error: 'Please sign in to submit songs' });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/user-songs/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session.user as any).accessToken || ''}`,
        },
        body: JSON.stringify({
          youtube_url: youtubeUrl,
        }),
      });

      const data: SubmitResponse = await res.json();
      setResponse(data);

      if (data.success) {
        setYoutubeUrl('');
        
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
          if (onSongSubmitted) {
            onSongSubmitted();
          }
        }, 2000);
      }
    } catch (error) {
      setResponse({
        success: false,
        message: '',
        error: error instanceof Error ? error.message : 'Failed to submit song',
      });
    } finally {
      setIsLoading(false);
    }
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info */}
          <p className="text-sm text-gray-400">
            Paste a YouTube link to add a song to your playlist. It will be reviewed by our admins.
          </p>

          {/* YouTube URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              YouTube URL
            </label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !youtubeUrl.trim()}
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
    </div>
  );
}
