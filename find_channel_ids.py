#!/usr/bin/env python3
"""
Find correct YouTube channel/playlist IDs for UEFA and Sony Sports
"""
import sys
sys.path.insert(0, '/Users/s0m13i5/linus/multi-media/backend')

from dotenv import load_dotenv
load_dotenv('/Users/s0m13i5/linus/multi-media/backend/.env')

from googleapiclient.discovery import build
import os

def find_channel_playlist_id(channel_name: str):
    """Search for a channel and get its uploads playlist ID"""
    api_keys = os.getenv('YOUTUBE_API_KEYS', '').split(',')
    if not api_keys or not api_keys[0]:
        print("No API key configured")
        return
    
    youtube = build('youtube', 'v3', developerKey=api_keys[0])
    
    try:
        # Search for channel
        search_response = youtube.search().list(
            q=channel_name,
            type='channel',
            part='id,snippet',
            maxResults=5
        ).execute()
        
        print(f"\n🔍 Search results for: {channel_name}")
        print("="*80)
        
        for item in search_response.get('items', []):
            channel_id = item['id']['channelId']
            channel_title = item['snippet']['title']
            
            # Get channel details including uploads playlist
            channel_response = youtube.channels().list(
                part='contentDetails,snippet,statistics',
                id=channel_id
            ).execute()
            
            if channel_response.get('items'):
                channel_info = channel_response['items'][0]
                uploads_playlist = channel_info['contentDetails']['relatedPlaylists']['uploads']
                subscriber_count = channel_info['statistics'].get('subscriberCount', 'N/A')
                
                print(f"\n📺 {channel_title}")
                print(f"   Channel ID: {channel_id}")
                print(f"   Uploads Playlist: {uploads_playlist}")
                print(f"   Subscribers: {subscriber_count}")
                print(f"   URL: https://www.youtube.com/channel/{channel_id}")
        
        print("\n" + "="*80 + "\n")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    channels_to_find = [
        "DAZN Canada",
        "Stan Sport",
        "beIN SPORTS",
        "Canal+ Sport",
        "Viaplay",
    ]
    
    for channel in channels_to_find:
        find_channel_playlist_id(channel)
