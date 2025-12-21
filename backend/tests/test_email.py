"""
Test cases for email notification service.
Run with: python -m pytest tests/test_email.py -v
Or just run: python tests/test_email.py
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.email_service import send_missing_highlights_notification
from app.config import get_settings


def test_email_notification():
    """
    Test sending a real email notification.
    This will send an actual email to verify the setup works.
    """
    settings = get_settings()
    
    print("\n" + "="*60)
    print("EMAIL NOTIFICATION TEST")
    print("="*60)
    
    # Check if email is configured
    if not settings.email_configured():
        print("❌ Email not configured!")
        print(f"   SMTP_USER: {'✓' if settings.smtp_user else '✗ Missing'}")
        print(f"   SMTP_PASSWORD: {'✓' if settings.smtp_password else '✗ Missing'}")
        print(f"   NOTIFICATION_EMAIL: {'✓' if settings.notification_email else '✗ Missing'}")
        return False
    
    print(f"✓ Email configured")
    print(f"  From: {settings.smtp_user}")
    print(f"  To: {settings.notification_email}")
    print(f"  SMTP: {settings.smtp_host}:{settings.smtp_port}")
    
    # Create test data
    test_matches = [
        {
            'match_id': 999,
            'home_team': 'Manchester United',
            'away_team': 'Liverpool',
            'match_date': '2025-12-20',
            'league_name': 'English Premier League'
        },
        {
            'match_id': 1000,
            'home_team': 'Real Madrid',
            'away_team': 'Barcelona',
            'match_date': '2025-12-20',
            'league_name': 'La Liga'
        },
        {
            'match_id': 1001,
            'home_team': 'Bayern Munich',
            'away_team': 'Borussia Dortmund',
            'match_date': '2025-12-20',
            'league_name': 'German Bundesliga'
        }
    ]
    
    print(f"\nSending test email with {len(test_matches)} sample matches...")
    print("-"*60)
    
    # Send the email
    result = send_missing_highlights_notification(test_matches)
    
    if result:
        print("\n✅ EMAIL SENT SUCCESSFULLY!")
        print(f"   Check your inbox at: {settings.notification_email}")
    else:
        print("\n❌ EMAIL FAILED TO SEND")
        print("   Check the error messages above")
    
    print("="*60 + "\n")
    return result


def test_empty_matches():
    """Test that empty match list doesn't send email."""
    print("\nTesting empty matches list...")
    result = send_missing_highlights_notification([])
    print(f"Empty list returns: {result} (expected: True)")
    assert result == True, "Empty list should return True without sending"
    print("✓ Passed")


def test_config_values():
    """Display current configuration (without exposing password)."""
    settings = get_settings()
    
    print("\n" + "="*60)
    print("CONFIGURATION CHECK")
    print("="*60)
    print(f"SMTP Host: {settings.smtp_host}")
    print(f"SMTP Port: {settings.smtp_port}")
    print(f"SMTP User: {settings.smtp_user or 'NOT SET'}")
    print(f"SMTP Password: {'*' * len(settings.smtp_password) if settings.smtp_password else 'NOT SET'}")
    print(f"Notification Email: {settings.notification_email or 'NOT SET'}")
    print(f"Email Configured: {settings.email_configured()}")
    print("="*60 + "\n")


if __name__ == "__main__":
    # Run tests
    test_config_values()
    test_empty_matches()
    
    # Ask before sending real email
    print("\n" + "="*60)
    response = input("Send a REAL test email? (y/n): ").strip().lower()
    if response == 'y':
        test_email_notification()
    else:
        print("Skipped email test.")
