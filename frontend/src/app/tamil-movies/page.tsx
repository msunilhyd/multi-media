'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import MusicPlaylist from '@/components/MusicPlaylist';
import type { Song } from '@/lib/api';

interface SamplePlaylist {
  id: number;
  name: string;
  song_count: number;
}

interface SamplePlaylistSong {
  id: number;
  title: string;
  artist: string | null;
  youtube_video_id: string;
}

interface SamplePlaylistDetail extends SamplePlaylist {
  songs: SamplePlaylistSong[];
}

export default function TamilMoviesPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAdminSongs = async () => {
      try {
        const playlistsResponse = await fetch('/api/sample-playlists', { cache: 'no-store' });
        if (!playlistsResponse.ok) throw new Error('Failed to load admin playlists');

        const playlists: SamplePlaylist[] = await playlistsResponse.json();
        const details = await Promise.all(
          playlists.map(async (playlist) => {
            const response = await fetch(`/api/sample-playlists/${playlist.id}`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Failed to load ${playlist.name}`);
            return response.json() as Promise<SamplePlaylistDetail>;
          })
        );

        setSongs(details.flatMap((playlist) => playlist.songs.map((song) => ({
          id: song.id,
          title: song.title,
          videoId: song.youtube_video_id,
          language: 'Admin staging',
          composer: song.artist || 'Various Artists',
          year: null,
          movie: playlist.name,
        }))));
      } catch (err) {
        console.error('Failed to load admin songs:', err);
        setError('Failed to load staged admin songs.');
      } finally {
        setLoading(false);
      }
    };

    loadAdminSongs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />
      {loading && <div className="p-8 text-center text-white">Loading admin songs...</div>}
      {error && <div className="p-8 text-center text-red-300">{error}</div>}
      {!loading && !error && (
        <MusicPlaylist playlist={{ slug: 'admin-staging', title: 'Admin Movie Soundtracks', songs }} />
      )}
    </div>
  );
}
