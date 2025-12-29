#!/usr/bin/env python3
import requests
import json

# First, create a user and get token
base_url = "http://127.0.0.1:8000"

# Register a new user (or login if exists)
try:
    response = requests.post(f"{base_url}/api/auth/register", json={
        "email": "testuser2@example.com",
        "password": "testpass123",
        "name": "Test User 2"
    })
    if response.status_code == 200:
        token_data = response.json()
        token = token_data["access_token"]
        print("✅ User registered successfully")
    else:
        # Try to login instead
        response = requests.post(f"{base_url}/api/auth/login", json={
            "email": "testuser2@example.com", 
            "password": "testpass123"
        })
        if response.status_code == 200:
            token_data = response.json()
            token = token_data["access_token"]
            print("✅ User logged in successfully")
        else:
            print(f"❌ Auth failed: {response.text}")
            exit(1)
except Exception as e:
    print(f"❌ Auth error: {e}")
    exit(1)

# Test playlist creation
print(f"Using token: {token[:20]}...")

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

playlist_data = {
    "title": "My Test Playlist",
    "description": "A playlist created by script",
    "is_public": False
}

print("Testing playlist creation...")

# Test both with and without trailing slash
for url in [f"{base_url}/api/playlists", f"{base_url}/api/playlists/"]:
    print(f"\nTesting URL: {url}")
    try:
        response = requests.post(url, headers=headers, json=playlist_data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            print("✅ Playlist created successfully!")
            break
        elif response.status_code == 404:
            print("❌ Not Found - endpoint doesn't exist")
        elif response.status_code == 401:
            print("❌ Unauthorized - token issue")
        else:
            print(f"❌ Error: {response.status_code}")
    except Exception as e:
        print(f"❌ Request error: {e}")

# Fun playlist section
print("\n" + "="*50)
print("🎉 TESTING FUN PLAYLIST SECTION")
print("="*50)

fun_playlist_data = {
    "title": "Fun Vibes Playlist",
    "description": "A playlist for fun and entertaining content",
    "is_public": True
}

print("Creating fun playlist...")

try:
    response = requests.post(f"{base_url}/api/playlists", headers=headers, json=fun_playlist_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:200]}...")
    
    if response.status_code == 200:
        fun_playlist = response.json()
        playlist_id = fun_playlist.get("id")
        print(f"✅ Fun playlist created successfully! ID: {playlist_id}")
        
        # Test adding some fun content (if you have songs/tracks)
        print("\nTesting fun playlist features...")
        
        # Get playlist details
        get_response = requests.get(f"{base_url}/api/playlists/{playlist_id}", headers=headers)
        if get_response.status_code == 200:
            print("✅ Fun playlist retrieval successful!")
        else:
            print(f"❌ Failed to retrieve fun playlist: {get_response.status_code}")
            
    else:
        print(f"❌ Failed to create fun playlist: {response.status_code}")
        print(f"Error details: {response.text}")
        
except Exception as e:
    print(f"❌ Fun playlist error: {e}")

print("\n🎉 Fun playlist section testing completed!")