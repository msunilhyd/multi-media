const fs = require('fs');

// Read the original playlists.js file
const content = fs.readFileSync('/Users/s0m13i5/walmart/kafka-db2-projects/lps_iterative/src/samples/playlists.js', 'utf8');

// Extract songs by finding lines that start with ['
const lines = content.split('\n');
const songs = [];
let id = 1;

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith("['")) {
    // Parse each song array: ['title', 'language', 'year', 'composer', 'videoId', 'movie', startSeconds?, endSeconds?]
    // Need to handle various formats
    const match = trimmed.match(/^\['([^']*)',\s*'([^']*)',\s*'?([^',]*)'?,\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'(?:,\s*(\d+))?(?:,\s*(\d+))?\]/);
    
    if (match) {
      const [_, title, language, year, composer, videoId, movie, startSeconds, endSeconds] = match;
      
      // Clean videoId - some have space and number suffix like 'abc123 1'
      const cleanVideoId = videoId.split(' ')[0];
      
      songs.push({
        id: id++,
        title: title.replace(/\\'/g, "'"),
        language: language,
        year: year.replace(/'/g, ''),
        composer: composer.replace(/\\'/g, "'"),
        videoId: cleanVideoId,
        movie: movie.replace(/\\'/g, "'"),
        startSeconds: startSeconds ? parseInt(startSeconds) : undefined,
        endSeconds: endSeconds ? parseInt(endSeconds) : undefined
      });
    }
  }
}

console.log('Found ' + songs.length + ' songs');

// Generate TypeScript file content
let tsContent = 'export interface Song {\n';
tsContent += '  id: number;\n';
tsContent += '  title: string;\n';
tsContent += '  language: string;\n';
tsContent += '  year: string;\n';
tsContent += '  composer: string;\n';
tsContent += '  videoId: string;\n';
tsContent += '  movie: string;\n';
tsContent += '  startSeconds?: number;\n';
tsContent += '  endSeconds?: number;\n';
tsContent += '}\n\n';

tsContent += 'export interface Playlist {\n';
tsContent += '  slug: string;\n';
tsContent += '  title: string;\n';
tsContent += '  songs: Song[];\n';
tsContent += '}\n\n';

tsContent += 'export const defaultPlaylist: Song[] = [\n';

for (const song of songs) {
  tsContent += '  {\n';
  tsContent += '    id: ' + song.id + ',\n';
  tsContent += '    title: "' + song.title.replace(/"/g, '\\"') + '",\n';
  tsContent += '    language: "' + song.language + '",\n';
  tsContent += '    year: "' + song.year + '",\n';
  tsContent += '    composer: "' + song.composer.replace(/"/g, '\\"') + '",\n';
  tsContent += '    videoId: "' + song.videoId + '",\n';
  tsContent += '    movie: "' + song.movie.replace(/"/g, '\\"') + '",\n';
  if (song.startSeconds !== undefined) {
    tsContent += '    startSeconds: ' + song.startSeconds + ',\n';
  }
  if (song.endSeconds !== undefined) {
    tsContent += '    endSeconds: ' + song.endSeconds + ',\n';
  }
  tsContent += '  },\n';
}

tsContent += '];\n\n';

tsContent += 'export const playlistKi: Playlist = {\n';
tsContent += '  slug: "playlistKi",\n';
tsContent += '  title: "My Music Collection",\n';
tsContent += '  songs: defaultPlaylist,\n';
tsContent += '};\n\n';

tsContent += 'export const playlists: Record<string, Playlist> = {\n';
tsContent += '  one: playlistKi\n';
tsContent += '};\n';

fs.writeFileSync('src/data/playlists.ts', tsContent);
console.log('Created src/data/playlists.ts with ' + songs.length + ' songs');
