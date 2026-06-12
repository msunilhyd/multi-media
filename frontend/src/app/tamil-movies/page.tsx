'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import MusicPlaylist from '@/components/MusicPlaylist';
import type { Song } from '@/lib/api';

const tamilMovieSongs: Song[] = [
  { id: 1, title: 'Love Insurance Kompany', videoId: 'AQIjnZ4aiPk', language: 'Tamil', composer: 'Tamil', year: '2024', movie: 'Love Insurance Kompany' },
  { id: 2, title: 'The Bastards of Bollywood', videoId: 'K9vH-ZEuLlo', language: 'Tamil', composer: 'Tamil', year: '2024', movie: 'The Bastards of Bollywood' },
  { id: 3, title: 'Madharaasi', videoId: 'uI3Ik_hQqSM', language: 'Tamil', composer: 'Tamil', year: '2023', movie: 'Madharaasi' },
  { id: 4, title: 'Coolie', videoId: 'Qol17Nio7Gs', language: 'Tamil', composer: 'Tamil', year: '2023', movie: 'Coolie' },
  { id: 5, title: 'Kingdom', videoId: 'jCdq7Efh4Sg', language: 'Tamil', composer: 'Tamil', year: '2023', movie: 'Kingdom' },
  { id: 6, title: 'Vidaamuyarchi', videoId: 'Umc6GvZtomc', language: 'Tamil', composer: 'Tamil', year: '2023', movie: 'Vidaamuyarchi' },
  { id: 7, title: 'Vettaiyan', videoId: '7XhnHF1rhPo', language: 'Tamil', composer: 'Tamil', year: '2023', movie: 'Vettaiyan' },
  { id: 8, title: 'Devara: Part 1', videoId: 'eQYAAxa_yLM', language: 'Tamil', composer: 'Tamil', year: '2023', movie: 'Devara: Part 1' },
  { id: 9, title: 'Indian 2', videoId: '2xK5hyrX3bE', language: 'Tamil', composer: 'Tamil', year: '2023', movie: 'Indian 2' },
  { id: 10, title: 'Leo', videoId: 'QLtoSEqF8ag', language: 'Tamil', composer: 'Tamil', year: '2023', movie: 'Leo' },
  { id: 11, title: 'Jawan', videoId: 'HjC_8MBNGiM', language: 'Tamil', composer: 'Tamil', year: '2023', movie: 'Jawan' },
  { id: 12, title: 'Jailer', videoId: 'X8k6LPsB4tY', language: 'Tamil', composer: 'Tamil', year: '2023', movie: 'Jailer' },
  { id: 13, title: 'Thiruchitrambalam', videoId: '4oXtsc_uzys', language: 'Tamil', composer: 'Tamil', year: '2022', movie: 'Thiruchitrambalam' },
  { id: 14, title: 'Vikram', videoId: 'PidAQRPQZx4', language: 'Tamil', composer: 'Tamil', year: '2022', movie: 'Vikram' },
  { id: 15, title: 'Don', videoId: '4tWN-wYZXOs', language: 'Tamil', composer: 'Tamil', year: '2022', movie: 'Don' },
  { id: 16, title: 'Kaathuvaakula Rendu Kaadhal', videoId: 'FP48VHl4Njg', language: 'Tamil', composer: 'Tamil', year: '2022', movie: 'Kaathuvaakula Rendu Kaadhal' },
  { id: 17, title: 'Jersey', videoId: 'ruVHJatQKFI', language: 'Tamil', composer: 'Tamil', year: '2022', movie: 'Jersey' },
  { id: 18, title: 'Beast', videoId: '7I08LjJcUIA', language: 'Tamil', composer: 'Tamil', year: '2022', movie: 'Beast' },
  { id: 19, title: 'Naai Sekar', videoId: '-9JfpJDnVmU', language: 'Tamil', composer: 'Tamil', year: '2022', movie: 'Naai Sekar' },
  { id: 20, title: 'Doctor', videoId: 'FXRlx5QSzPs', language: 'Tamil', composer: 'Tamil', year: '2021', movie: 'Doctor' },
  { id: 21, title: 'Master', videoId: 'd2SYKWBlwjE', language: 'Tamil', composer: 'Tamil', year: '2021', movie: 'Master' },
  { id: 22, title: 'Paava Kadhaigal', videoId: 'Io578z_ow-E', language: 'Tamil', composer: 'Tamil', year: '2021', movie: 'Paava Kadhaigal' },
  { id: 23, title: 'Dharala Prabhu', videoId: '-rJaYo0tixg', language: 'Tamil', composer: 'Tamil', year: '2020', movie: 'Dharala Prabhu' },
  { id: 24, title: 'Darbar', videoId: 'VGYLCXJhJnI', language: 'Tamil', composer: 'Tamil', year: '2020', movie: 'Darbar' },
  { id: 25, title: 'Gang Leader', videoId: 'wNAtjwnnBGM', language: 'Tamil', composer: 'Tamil', year: '2019', movie: 'Gang Leader' },
  { id: 26, title: 'Petta', videoId: '_p-gFcfU74M', language: 'Tamil', composer: 'Tamil', year: '2019', movie: 'Petta' },
  { id: 27, title: 'U Turn', videoId: '1himtoWeA_U', language: 'Tamil', composer: 'Tamil', year: '2019', movie: 'U Turn' },
  { id: 28, title: 'Kolamaavu Kokila', videoId: 'z64mC4diJiI', language: 'Tamil', composer: 'Tamil', year: '2018', movie: 'Kolamaavu Kokila' },
  { id: 29, title: 'Thaanaa Serndha Koottam', videoId: 'WgWCunzGync', language: 'Tamil', composer: 'Tamil', year: '2018', movie: 'Thaanaa Serndha Koottam' },
  { id: 30, title: 'Agnyaathavaasi', videoId: 'UK3En9JWZ3w', language: 'Tamil', composer: 'Tamil', year: '2018', movie: 'Agnyaathavaasi' },
  { id: 31, title: 'Velaikkaran', videoId: '0sj4-teWNUk', language: 'Tamil', composer: 'Tamil', year: '2017', movie: 'Velaikkaran' },
  { id: 32, title: 'Vivegam', videoId: 'aiyZ8XjFAOI', language: 'Tamil', composer: 'Tamil', year: '2017', movie: 'Vivegam' },
  { id: 33, title: 'Remo', videoId: 'SeWhE0wBdzQ', language: 'Tamil', composer: 'Tamil', year: '2016', movie: 'Remo' },
  { id: 34, title: 'Thanga Magan', videoId: 'Lr9NGD51bFU', language: 'Tamil', composer: 'Tamil', year: '2015', movie: 'Thanga Magan' },
  { id: 35, title: 'Vedalam', videoId: '9VsPtV-wfK0', language: 'Tamil', composer: 'Tamil', year: '2015', movie: 'Vedalam' },
  { id: 36, title: 'Naanum Rowdydhaan', videoId: 'C5z0mj5QgXE', language: 'Tamil', composer: 'Tamil', year: '2015', movie: 'Naanum Rowdydhaan' },
  { id: 37, title: 'Maari', videoId: 'cXPAmlHTCHY', language: 'Tamil', composer: 'Tamil', year: '2015', movie: 'Maari' },
  { id: 38, title: 'Maari 2', videoId: 'QBA8oLAd7Us', language: 'Tamil', composer: 'Tamil', year: '2018', movie: 'Maari 2' },
  { id: 39, title: 'Kaaki Sattai', videoId: 'y_9ZglKVc4c', language: 'Tamil', composer: 'Tamil', year: '2014', movie: 'Kaaki Sattai' },
  { id: 40, title: 'Kaththi', videoId: 'FHPcU49i-DI', language: 'Tamil', composer: 'Tamil', year: '2014', movie: 'Kaththi' },
  { id: 41, title: 'Maan Karate', videoId: 'g1hkxWb5418', language: 'Tamil', composer: 'Tamil', year: '2014', movie: 'Maan Karate' },
  { id: 42, title: 'Velaiilla Pattadhari', videoId: '6UvIeH7Hzt4', language: 'Tamil', composer: 'Tamil', year: '2014', movie: 'Velaiilla Pattadhari' },
  { id: 43, title: 'Irandaam Ulagam', videoId: 'rpvUY8FKDG8', language: 'Tamil', composer: 'Tamil', year: '2013', movie: 'Irandaam Ulagam' },
  { id: 44, title: 'Vanakkam Chennai', videoId: 'p6I7mr7lFFI', language: 'Tamil', composer: 'Tamil', year: '2013', movie: 'Vanakkam Chennai' },
  { id: 45, title: 'David', videoId: 'CXhvNA3aTyA', language: 'Tamil', composer: 'Tamil', year: '2013', movie: 'David' },
  { id: 46, title: 'Ethir Neechal', videoId: '3opHKmcdImQ', language: 'Tamil', composer: 'Tamil', year: '2013', movie: 'Ethir Neechal' },
  { id: 47, title: '3', videoId: '5bjUOMxQm_o', language: 'Tamil', composer: 'Tamil', year: '2012', movie: '3' },
];

export default function TamilMoviesPage() {
  const playlist = {
    slug: 'tamil-movies',
    title: 'Tamil Movie Soundtracks',
    songs: tamilMovieSongs,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />
      <MusicPlaylist playlist={playlist} />
    </div>
  );
}
