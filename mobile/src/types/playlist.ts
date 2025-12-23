export interface Song {
  id: number;
  title: string;
  language: string;
  year: string;
  composer: string;
  videoId: string;
  movie: string;
  startSeconds?: number;
  endSeconds?: number;
}

export interface Playlist {
  slug: string;
  title: string;
  songs: Song[];
}

// Sample playlist for testing - you can later fetch this from your API
export const samplePlaylist: Playlist = {
  slug: 'test-playlist',
  title: 'LinusPlaylists Sample',
  songs: [
    {
      id: 1,
      title: "Sahiba",
      language: "HINDI",
      year: "2024", 
      composer: "Jasleen Royal",
      videoId: "Npd94-t1Lv0",
      movie: "Rockstar",
    },
    {
      id: 2,
      title: "Lost Art",
      language: "HINDI",
      year: "2017",
      composer: "Pritam", 
      videoId: "Jk1lfH7OG74",
      movie: "Jab Harry Met Sejal",
    },
    {
      id: 3,
      title: "Chinnaware",
      language: "TAMIL",
      year: "2011",
      composer: "A.R Rahman",
      videoId: "MR0JcGw5bpo", 
      movie: "Rockstar",
    }
  ]
};