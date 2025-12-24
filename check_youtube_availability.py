#!/usr/bin/env python3
"""
Script to check YouTube video availability from the playlist.
Identifies videos that are no longer available on YouTube.
"""

import json
import re
import time
import requests
from typing import List, Dict

def extract_songs_from_ts_file(file_path: str) -> List[Dict]:
    """Extract song data from the TypeScript playlist file."""
    songs = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all song objects using regex
    song_pattern = r'\{\s*id:\s*(\d+),\s*title:\s*"([^"]+)",\s*language:\s*"([^"]+)",\s*year:\s*"([^"]+)",\s*composer:\s*"([^"]+)",\s*videoId:\s*"([^"]+)",\s*movie:\s*"([^"]+)"'
    
    matches = re.finditer(song_pattern, content)
    
    for match in matches:
        songs.append({
            'id': int(match.group(1)),
            'title': match.group(2),
            'language': match.group(3),
            'year': match.group(4),
            'composer': match.group(5),
            'videoId': match.group(6),
            'movie': match.group(7)
        })
    
    return songs

def check_video_availability(video_id: str) -> tuple[bool, str]:
    """
    Check if a YouTube video is available.
    Returns (is_available, status_message)
    """
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return True, "Available"
        elif response.status_code == 404:
            return False, "Video not found (deleted/private)"
        else:
            return False, f"Error: Status {response.status_code}"
    except requests.exceptions.Timeout:
        return False, "Timeout"
    except requests.exceptions.RequestException as e:
        return False, f"Request error: {str(e)}"

def main():
    print("🎵 Checking YouTube video availability from playlist...\n")
    
    playlist_file = "/Users/s0m13i5/linus/multi-media/mobile/src/data/playlists.ts"
    
    print(f"📂 Reading playlist from: {playlist_file}")
    songs = extract_songs_from_ts_file(playlist_file)
    
    print(f"✅ Found {len(songs)} songs in playlist\n")
    print("🔍 Checking availability (this may take a while)...\n")
    
    unavailable_songs = []
    available_count = 0
    error_count = 0
    
    for i, song in enumerate(songs, 1):
        video_id = song['videoId']
        
        # Progress indicator
        if i % 100 == 0:
            print(f"Progress: {i}/{len(songs)} checked...")
        
        is_available, status = check_video_availability(video_id)
        
        if not is_available:
            unavailable_songs.append({
                **song,
                'status': status,
                'url': f"https://www.youtube.com/watch?v={video_id}"
            })
            print(f"❌ [{i}] {song['title']} - {status}")
        else:
            available_count += 1
        
        # Rate limiting - be nice to YouTube
        time.sleep(0.5)
    
    # Summary
    print("\n" + "="*80)
    print("📊 SUMMARY")
    print("="*80)
    print(f"Total songs: {len(songs)}")
    print(f"Available: {available_count}")
    print(f"Unavailable: {len(unavailable_songs)}")
    print("="*80)
    
    if unavailable_songs:
        print("\n❌ UNAVAILABLE VIDEOS:\n")
        for song in unavailable_songs:
            print(f"ID: {song['id']}")
            print(f"Title: {song['title']}")
            print(f"Composer: {song['composer']}")
            print(f"Movie: {song['movie']}")
            print(f"Language: {song['language']}")
            print(f"Year: {song['year']}")
            print(f"Video ID: {song['videoId']}")
            print(f"URL: {song['url']}")
            print(f"Status: {song['status']}")
            print("-" * 80)
        
        # Save to JSON file
        output_file = "/Users/s0m13i5/linus/multi-media/unavailable_songs.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(unavailable_songs, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Unavailable songs saved to: {output_file}")
    else:
        print("\n✅ All videos are available!")

if __name__ == "__main__":
    main()
