'use client';

import { useEffect, useState } from 'react';
import { Smile, Laugh } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import MusicPlaylist from '@/components/MusicPlaylist';
import UserPlaylists from '@/components/UserPlaylists';
import { fetchEntertainment, type Entertainment } from '@/lib/api';

import type { Song } from '@/lib/api';

type Tab = 'funny' | 'user-playlists' | 'user-playlist';

interface UserPlaylist {
  id: number;
  title: string;
  description: string | null;
  is_public: boolean;
  playlist_type: string;
  created_at: string;
  updated_at: string;
  song_count: number;
  songs?: Song[];
}

export default function FunPage() {
  const [entertainmentItems, setEntertainmentItems] = useState<Entertainment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('funny');
  const [selectedUserPlaylist, setSelectedUserPlaylist] = useState<UserPlaylist | null>(null);
  const { data: session } = useSession();

  // Convert entertainment items to song format for playlist component
  const entertainmentToSongs = (items: Entertainment[]): Song[] => {
    return items.map(item => ({
      id: item.id, // Use the entertainment ID to ensure uniqueness
      title: item.title,
      language: '', // Empty language for entertainment content
      year: '-', // No year for entertainment
      composer: item.channel_title || '',
      videoId: item.youtube_video_id,
      movie: '-', // No movie/content type display
      startSeconds: item.start_seconds,
      endSeconds: item.end_seconds
    }));
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        
        // Load entertainment content using the API function
        const entertainmentData = await fetchEntertainment();
        console.log('Loaded entertainment data:', entertainmentData);
        setEntertainmentItems(entertainmentData);
        
      } catch (err) {
        setError('Failed to load content. Please try again later.');
        console.error('Error loading content:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  const handleSelectUserPlaylist = async (playlist: UserPlaylist) => {
    // Fetch the full playlist details including songs
    if (!session) return;

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`);

      if (response.ok) {
        const fullPlaylist = await response.json();
        setSelectedUserPlaylist(fullPlaylist);
        setActiveTab('user-playlist');
      } else {
        console.error('Failed to fetch playlist details');
      }
    } catch (error) {
      console.error('Error fetching playlist details:', error);
    }
  };

  // Get content based on fun categories
  const getFunContent = (category: string): Song[] => {
    switch (category) {
      case 'funny':
        // All entertainment items are already sorted by created_at DESC from backend
        const funItems = entertainmentItems
          .filter(item => item.content_type === 'fun');
        const result = entertainmentToSongs(funItems);
        console.log('Funny category - Entertainment items:', funItems);
        console.log('Funny category - Converted songs:', result);
        return result;
        
      default:
        // Return all entertainment content (all should be type 'fun'), sorted by ID
        const allItems = entertainmentItems.sort((a, b) => a.id - b.id);
        return entertainmentToSongs(allItems);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading fun content...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-2xl mx-auto px-4">
            <Laugh className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Fun Content Temporarily Unavailable
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We're having trouble loading the entertainment videos right now. Please try refreshing the page or check back in a few moments.
            </p>
            <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3">
                Available Fun Content:
              </h3>
              <ul className="text-left text-gray-600 dark:text-gray-400 space-y-2">
                <li>• Comedy skits and funny videos</li>
                <li>• Short films and creative content</li>
                <li>• Viral entertainment clips</li>
                <li>• Hilarious moments from popular creators</li>
                <li>• Create and save custom fun playlists</li>
              </ul>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'funny':
        return (
          <MusicPlaylist 
            playlist={{
              slug: 'funny',
              title: '😂 Funny & Comedy',
              songs: getFunContent('funny')
            }} 
          />
        );
      
      case 'user-playlists':
        return <UserPlaylists onSelectPlaylist={handleSelectUserPlaylist} playlistType="entertainment" />;
      
      case 'user-playlist':
        if (!selectedUserPlaylist) {
          setActiveTab('user-playlists');
          return null;
        }
        return (
          <div>
            <button
              onClick={() => setActiveTab('user-playlists')}
              className="mb-6 text-pink-600 hover:text-pink-700 font-medium text-sm flex items-center gap-2"
            >
              ← Back to My Playlists
            </button>
            <MusicPlaylist 
              playlist={{
                slug: `user-playlist-${selectedUserPlaylist.id}`,
                title: selectedUserPlaylist.title,
                songs: selectedUserPlaylist.songs || []
              }} 
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* SEO Content - Always Visible */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4 flex items-center justify-center gap-3">
            <Laugh className="w-8 h-8 text-pink-500" />
            Fun Zone
            <Laugh className="w-8 h-8 text-pink-500" />
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-4">
            Discover entertaining videos, comedy skits, funny clips, and short films. 
            Watch viral content, hilarious moments, and creative entertainment from popular creators.
          </p>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500">
            Free entertainment • Funny videos • Comedy content • Short films • Viral clips
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 justify-center md:justify-start">
              <button
                onClick={() => setActiveTab('funny')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'funny'
                    ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Laugh className="w-4 h-4" />
                Funny ({getFunContent('funny').length})
              </button>
              <button
                onClick={() => setActiveTab('user-playlists')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'user-playlists' || activeTab === 'user-playlist'
                    ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Smile className="w-4 h-4" />
                My Fun Playlists
              </button>
            </nav>
          </div>
        </div>

        {renderContent()}
      </main>
      
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Fun Zone
          </p>
        </div>
      </footer>
    </div>
  );
}