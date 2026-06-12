'use client';

import { useState } from 'react';
import { Play, Music, Search, X } from 'lucide-react';

interface TamilMovie {
  title: string;
  videoId: string;
  url: string;
}

const tamilMovies: TamilMovie[] = [
  { title: 'Love Insurance Kompany', videoId: 'AQIjnZ4aiPk', url: 'https://www.youtube.com/watch?v=AQIjnZ4aiPk' },
  { title: 'The Bastards of Bollywood', videoId: 'K9vH-ZEuLlo', url: 'https://www.youtube.com/watch?v=K9vH-ZEuLlo' },
  { title: 'Madharaasi', videoId: 'uI3Ik_hQqSM', url: 'https://www.youtube.com/watch?v=uI3Ik_hQqSM' },
  { title: 'Coolie', videoId: 'Qol17Nio7Gs', url: 'https://www.youtube.com/watch?v=Qol17Nio7Gs' },
  { title: 'Kingdom', videoId: 'jCdq7Efh4Sg', url: 'https://www.youtube.com/watch?v=jCdq7Efh4Sg' },
  { title: 'Vidaamuyarchi', videoId: 'Umc6GvZtomc', url: 'https://www.youtube.com/watch?v=Umc6GvZtomc' },
  { title: 'Vettaiyan', videoId: '7XhnHF1rhPo', url: 'https://youtu.be/7XhnHF1rhPo' },
  { title: 'Devara: Part 1', videoId: 'eQYAAxa_yLM', url: 'https://youtu.be/eQYAAxa_yLM' },
  { title: 'Indian 2', videoId: '2xK5hyrX3bE', url: 'https://www.youtube.com/watch?v=2xK5hyrX3bE' },
  { title: 'Leo', videoId: 'QLtoSEqF8ag', url: 'https://www.youtube.com/watch?v=QLtoSEqF8ag' },
  { title: 'Jawan', videoId: 'HjC_8MBNGiM', url: 'https://www.youtube.com/watch?v=HjC_8MBNGiM' },
  { title: 'Jailer', videoId: 'X8k6LPsB4tY', url: 'https://www.youtube.com/watch?v=X8k6LPsB4tY' },
  { title: 'Thiruchitrambalam', videoId: '4oXtsc_uzys', url: 'https://www.youtube.com/watch?v=4oXtsc_uzys' },
  { title: 'Vikram', videoId: 'PidAQRPQZx4', url: 'https://www.youtube.com/watch?v=PidAQRPQZx4' },
  { title: 'Don', videoId: '4tWN-wYZXOs', url: 'https://www.youtube.com/watch?v=4tWN-wYZXOs' },
  { title: 'Kaathuvaakula Rendu Kaadhal', videoId: 'FP48VHl4Njg', url: 'https://www.youtube.com/watch?v=FP48VHl4Njg' },
  { title: 'Jersey', videoId: 'ruVHJatQKFI', url: 'https://www.youtube.com/watch?v=ruVHJatQKFI' },
  { title: 'Beast', videoId: '7I08LjJcUIA', url: 'https://www.youtube.com/watch?v=7I08LjJcUIA' },
  { title: 'Naai Sekar', videoId: '-9JfpJDnVmU', url: 'https://www.youtube.com/watch?v=-9JfpJDnVmU' },
  { title: 'Doctor', videoId: 'FXRlx5QSzPs', url: 'https://www.youtube.com/watch?v=FXRlx5QSzPs' },
  { title: 'Master', videoId: 'd2SYKWBlwjE', url: 'https://www.youtube.com/watch?v=d2SYKWBlwjE' },
  { title: 'Paava Kadhaigal', videoId: 'Io578z_ow-E', url: 'https://www.youtube.com/watch?v=Io578z_ow-E' },
  { title: 'Dharala Prabhu', videoId: '-rJaYo0tixg', url: 'https://www.youtube.com/watch?v=-rJaYo0tixg' },
  { title: 'Darbar', videoId: 'VGYLCXJhJnI', url: 'https://www.youtube.com/watch?v=VGYLCXJhJnI' },
  { title: 'Gang Leader', videoId: 'wNAtjwnnBGM', url: 'https://www.youtube.com/watch?v=wNAtjwnnBGM' },
  { title: 'Petta', videoId: '_p-gFcfU74M', url: 'https://www.youtube.com/watch?v=_p-gFcfU74M' },
  { title: 'U Turn', videoId: '1himtoWeA_U', url: 'https://www.youtube.com/watch?v=1himtoWeA_U' },
  { title: 'Kolamaavu Kokila', videoId: 'z64mC4diJiI', url: 'https://www.youtube.com/watch?v=z64mC4diJiI' },
  { title: 'Thaanaa Serndha Koottam', videoId: 'WgWCunzGync', url: 'https://www.youtube.com/watch?v=WgWCunzGync' },
  { title: 'Agnyaathavaasi', videoId: 'UK3En9JWZ3w', url: 'https://www.youtube.com/watch?v=UK3En9JWZ3w' },
  { title: 'Velaikkaran', videoId: '0sj4-teWNUk', url: 'https://www.youtube.com/watch?v=0sj4-teWNUk' },
  { title: 'Vivegam', videoId: 'aiyZ8XjFAOI', url: 'https://www.youtube.com/watch?v=aiyZ8XjFAOI' },
  { title: 'Remo', videoId: 'SeWhE0wBdzQ', url: 'https://www.youtube.com/watch?v=SeWhE0wBdzQ' },
  { title: 'Thanga Magan', videoId: 'Lr9NGD51bFU', url: 'https://www.youtube.com/watch?v=Lr9NGD51bFU' },
  { title: 'Vedalam', videoId: '9VsPtV-wfK0', url: 'https://www.youtube.com/watch?v=9VsPtV-wfK0' },
  { title: 'Naanum Rowdydhaan', videoId: 'C5z0mj5QgXE', url: 'https://www.youtube.com/watch?v=C5z0mj5QgXE' },
  { title: 'Maari', videoId: 'cXPAmlHTCHY', url: 'https://www.youtube.com/watch?v=cXPAmlHTCHY' },
  { title: 'Maari 2', videoId: 'QBA8oLAd7Us', url: 'https://www.youtube.com/watch?v=QBA8oLAd7Us' },
  { title: 'Kaaki Sattai', videoId: 'y_9ZglKVc4c', url: 'https://www.youtube.com/watch?v=y_9ZglKVc4c' },
  { title: 'Kaththi', videoId: 'FHPcU49i-DI', url: 'https://www.youtube.com/watch?v=FHPcU49i-DI' },
  { title: 'Maan Karate', videoId: 'g1hkxWb5418', url: 'https://www.youtube.com/watch?v=g1hkxWb5418' },
  { title: 'Velaiilla Pattadhari', videoId: '6UvIeH7Hzt4', url: 'https://www.youtube.com/watch?v=6UvIeH7Hzt4' },
  { title: 'Irandaam Ulagam', videoId: 'rpvUY8FKDG8', url: 'https://www.youtube.com/watch?v=rpvUY8FKDG8' },
  { title: 'Vanakkam Chennai', videoId: 'p6I7mr7lFFI', url: 'https://www.youtube.com/watch?v=p6I7mr7lFFI' },
  { title: 'David', videoId: 'CXhvNA3aTyA', url: 'https://www.youtube.com/watch?v=CXhvNA3aTyA' },
  { title: 'Ethir Neechal', videoId: '3opHKmcdImQ', url: 'https://www.youtube.com/watch?v=3opHKmcdImQ' },
  { title: '3', videoId: '5bjUOMxQm_o', url: 'https://www.youtube.com/watch?v=5bjUOMxQm_o' },
];

export default function TamilMovies() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState(tamilMovies[0]?.videoId || '');
  const [currentTitle, setCurrentTitle] = useState(tamilMovies[0]?.title || '');

  const filteredMovies = tamilMovies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlayMovie = (videoId: string, title: string) => {
    setCurrentVideoId(videoId);
    setCurrentTitle(title);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-red-500 to-pink-500 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Music className="w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">Tamil Movie Soundtracks</h1>
          </div>
          <p className="text-orange-100 text-lg">Enjoy the best Tamil movie music and soundtracks</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Video Player */}
        <div className="mb-8">
          <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl mb-4">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1`}
              title={currentTitle}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{currentTitle}</h2>
          <p className="text-gray-400">Now Playing</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Tamil movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-orange-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-2">
            {filteredMovies.length} movie{filteredMovies.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMovies.map((movie) => (
            <button
              key={movie.videoId}
              onClick={() => handlePlayMovie(movie.videoId, movie.title)}
              className={`group relative rounded-xl overflow-hidden transition-all duration-300 transform hover:scale-105 ${
                currentVideoId === movie.videoId
                  ? 'ring-2 ring-orange-500 shadow-lg shadow-orange-500/50'
                  : 'hover:shadow-lg'
              }`}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gray-800 relative overflow-hidden">
                <img
                  src={`https://img.youtube.com/vi/${movie.videoId}/mqdefault.jpg`}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Play className="w-12 h-12 text-white opacity-80 group-hover:opacity-100 transition-opacity fill-white" />
                </div>
              </div>

              {/* Title */}
              <div className="bg-gray-900 p-3 sm:p-4">
                <p className="text-white font-semibold text-sm sm:text-base line-clamp-2 text-left">
                  {movie.title}
                </p>
              </div>

              {/* Active Indicator */}
              {currentVideoId === movie.videoId && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </button>
          ))}
        </div>

        {filteredMovies.length === 0 && (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No movies found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
