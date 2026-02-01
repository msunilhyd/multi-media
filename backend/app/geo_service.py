"""
Geo-location service for detecting user's country from IP address.
Uses a simple IP-to-country mapping without requiring external databases.
"""
from typing import Optional
import httpx


class GeoService:
    """Service to detect user's country from IP address"""
    
    # Cache for IP lookups to avoid repeated API calls
    _cache = {}
    
    @staticmethod
    async def get_country_from_ip(ip_address: str) -> Optional[str]:
        """
        Get ISO 3166-1 alpha-2 country code from IP address.
        
        Args:
            ip_address: IPv4 or IPv6 address
            
        Returns:
            Two-letter country code (e.g., 'GB', 'US', 'IN') or None if detection fails
        """
        # Skip private/local IPs
        if not ip_address or ip_address in ['127.0.0.1', 'localhost', '::1']:
            return None
            
        # Check cache first
        if ip_address in GeoService._cache:
            return GeoService._cache[ip_address]
        
        try:
            # Use ip-api.com free service (no API key required, 45 req/min limit)
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(
                    f"http://ip-api.com/json/{ip_address}",
                    params={"fields": "countryCode,status"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'success':
                        country_code = data.get('countryCode')
                        if country_code:
                            # Cache the result
                            GeoService._cache[ip_address] = country_code
                            return country_code
        except Exception as e:
            print(f"[GeoService] Error detecting country for IP {ip_address}: {e}")
        
        return None
    
    @staticmethod
    def is_video_available_in_country(
        country_code: Optional[str],
        blocked_countries: list,
        allowed_countries: list
    ) -> bool:
        """
        Check if a video is available in the given country.
        
        Args:
            country_code: ISO 3166-1 alpha-2 country code (e.g., 'GB')
            blocked_countries: List of blocked country codes
            allowed_countries: List of allowed country codes (if set, ONLY these are allowed)
            
        Returns:
            True if video is available, False if blocked
        """
        # If we don't know the country, assume available (don't filter)
        if not country_code:
            return True
        
        # If allowlist exists, check if country is in it
        if allowed_countries and len(allowed_countries) > 0:
            return country_code in allowed_countries
        
        # Otherwise, check if country is in blocklist
        if blocked_countries and len(blocked_countries) > 0:
            return country_code not in blocked_countries
        
        # No restrictions
        return True
    
    @staticmethod
    def filter_highlights_by_country(
        highlights: list,
        country_code: Optional[str]
    ) -> tuple[list, list]:
        """
        Separate highlights into available and blocked based on user's country.
        
        Args:
            highlights: List of highlight dicts with geo-blocking fields
            country_code: User's country code
            
        Returns:
            Tuple of (available_highlights, blocked_highlights)
        """
        available = []
        blocked = []
        
        for highlight in highlights:
            is_available = GeoService.is_video_available_in_country(
                country_code,
                highlight.get('blocked_countries', []),
                highlight.get('allowed_countries', [])
            )
            
            if is_available:
                available.append(highlight)
            else:
                blocked.append(highlight)
        
        return available, blocked


def get_geo_service() -> GeoService:
    """Dependency injection for GeoService"""
    return GeoService()
