#!/usr/bin/env python3
"""
Script to create new user-related tables in the Railway PostgreSQL database.
Run this after deploying the updated models.
"""

import requests
import os
from app.config import get_settings

def create_tables_in_production():
    """Trigger table creation by hitting the API endpoint"""
    settings = get_settings()
    
    # The Railway app URL - replace with your actual URL
    railway_url = "https://multi-media-production.up.railway.app"
    
    try:
        print("🚀 Triggering table creation in Railway...")
        
        # Hit any endpoint to trigger SQLAlchemy table creation
        response = requests.get(f"{railway_url}/api/leagues", timeout=30)
        
        if response.status_code == 200:
            print("✅ Successfully connected to Railway app")
            print("📊 New tables should be created automatically by SQLAlchemy")
            print("\nTables added:")
            print("- users")
            print("- user_favorite_teams") 
            print("- notification_preferences")
            print("- notifications")
        else:
            print(f"❌ Failed to connect: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Connection failed: {e}")
        print("Make sure the Railway app is deployed and running")

if __name__ == "__main__":
    create_tables_in_production()