from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import yt_dlp
import asyncio
import logging
from typing import Optional, Dict, Any
from ..database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audio", tags=["audio"])

class AudioExtractor:
    def __init__(self):
        self.ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio[acodec=aac]/bestaudio',  # Prefer iOS-compatible formats
            'noplaylist': True,
            'extractaudio': True,
            'audioformat': 'm4a',  # Prefer m4a format for iOS compatibility
            'quiet': True,
            'no_warnings': True,
        }
    
    async def extract_audio_url(self, video_id: str, start_seconds: Optional[int] = None, end_seconds: Optional[int] = None) -> Dict[str, Any]:
        """Extract direct audio stream URL from YouTube video"""
        try:
            url = f"https://youtube.com/watch?v={video_id}"
            
            # Run yt-dlp in a separate thread to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._extract_info, url)
            
            if not result:
                raise HTTPException(status_code=404, detail="Video not found or unavailable")
            
            # Find the best audio format
            audio_url = None
            title = result.get('title', 'Unknown')
            duration = result.get('duration', 0)
            
            # Get direct audio stream URL
            if 'url' in result:
                audio_url = result['url']
            elif 'formats' in result:
                # Find best iOS-compatible audio format
                audio_formats = [f for f in result['formats'] if f.get('acodec') != 'none']
                if audio_formats:
                    # Prioritize iOS-compatible formats (m4a, aac, mp4)
                    ios_compatible = [f for f in audio_formats if 
                                    f.get('ext') in ['m4a', 'mp4'] or 
                                    f.get('acodec', '').startswith('aac') or
                                    'mp4' in f.get('url', '')]
                    
                    if ios_compatible:
                        # Sort iOS-compatible formats by quality
                        best_audio = max(ios_compatible, key=lambda x: x.get('abr', 0) or 0)
                    else:
                        # Fallback to best available audio format
                        best_audio = max(audio_formats, key=lambda x: x.get('abr', 0) or 0)
                    
                    audio_url = best_audio.get('url')
            
            if not audio_url:
                raise HTTPException(status_code=404, detail="No audio stream found")
            
            return {
                'audioUrl': audio_url,
                'title': title,
                'duration': duration,
                'videoId': video_id,
                'startSeconds': start_seconds,
                'endSeconds': end_seconds
            }
            
        except Exception as e:
            logger.error(f"Error extracting audio for {video_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Audio extraction failed: {str(e)}")
    
    def _extract_info(self, url: str) -> Optional[Dict]:
        """Synchronous wrapper for yt-dlp"""
        try:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)
        except Exception as e:
            logger.error(f"yt-dlp extraction failed: {str(e)}")
            return None

# Global extractor instance
audio_extractor = AudioExtractor()

@router.get("/stream/{video_id}")
async def get_audio_stream(
    video_id: str,
    start_seconds: Optional[int] = None,
    end_seconds: Optional[int] = None
):
    """Get direct audio stream URL for a YouTube video"""
    return await audio_extractor.extract_audio_url(video_id, start_seconds, end_seconds)

@router.get("/playlist/{playlist_name}")
async def get_playlist_audio_urls(playlist_name: str, db: Session = Depends(get_db)):
    """Get audio URLs for an entire playlist - useful for preloading next tracks"""
    # This will use the playlist data from your frontend
    # For now, returning a simple response - you can integrate with your playlist data later
    return {
        "playlist": playlist_name,
        "message": "Playlist audio streaming endpoint ready"
    }