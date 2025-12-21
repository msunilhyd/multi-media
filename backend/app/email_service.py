"""
Email notification service for missing highlights alerts.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import date
from typing import List, Dict
from .config import get_settings

settings = get_settings()


def send_missing_highlights_notification(missing_matches: List[Dict]) -> bool:
    """
    Send email notification about matches missing highlights.
    
    Args:
        missing_matches: List of dicts with match info:
            - home_team, away_team, match_date, league_name, match_id
    
    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.email_configured():
        print("[Email] Email not configured - skipping notification")
        return False
    
    if not missing_matches:
        return True  # Nothing to notify
    
    try:
        # Build email content
        subject = f"⚽ Missing Highlights Alert - {len(missing_matches)} matches ({date.today()})"
        
        # HTML body
        html_body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #4CAF50; color: white; }}
                tr:nth-child(even) {{ background-color: #f2f2f2; }}
                .header {{ color: #333; }}
            </style>
        </head>
        <body>
            <h2 class="header">⚽ Missing Highlights - Manual Update Required</h2>
            <p>The following {len(missing_matches)} match(es) from <strong>{missing_matches[0]['match_date']}</strong> 
            could not find highlights after multiple attempts:</p>
            
            <table>
                <tr>
                    <th>Match ID</th>
                    <th>Match</th>
                    <th>League</th>
                    <th>Date</th>
                </tr>
        """
        
        for match in missing_matches:
            html_body += f"""
                <tr>
                    <td>{match['match_id']}</td>
                    <td><strong>{match['home_team']}</strong> vs <strong>{match['away_team']}</strong></td>
                    <td>{match['league_name']}</td>
                    <td>{match['match_date']}</td>
                </tr>
            """
        
        html_body += """
            </table>
            
            <h3>How to manually add highlights:</h3>
            <ol>
                <li>Search YouTube for the match highlights</li>
                <li>Get the video ID from the URL (e.g., <code>dQw4w9WgXcQ</code> from youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>)</li>
                <li>Run this SQL to add the highlight:
                    <pre>
INSERT INTO highlights (match_id, youtube_video_id, title, channel_title, is_official)
VALUES (&lt;match_id&gt;, '&lt;video_id&gt;', '&lt;title&gt;', '&lt;channel&gt;', 1);
                    </pre>
                </li>
            </ol>
            
            <p style="color: #666; font-size: 12px;">
                This is an automated notification from Football Highlights API.
            </p>
        </body>
        </html>
        """
        
        # Plain text fallback
        text_body = f"Missing Highlights Alert\n\n"
        text_body += f"{len(missing_matches)} matches missing highlights:\n\n"
        for match in missing_matches:
            text_body += f"- [{match['match_id']}] {match['home_team']} vs {match['away_team']} ({match['league_name']})\n"
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = settings.smtp_user
        msg['To'] = settings.notification_email
        
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        # Send email
        try:
            # Try TLS on port 587 first
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
                server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        except Exception as e:
            # Fallback to SSL on port 465
            print(f"[Email] TLS failed ({e}), trying SSL...")
            with smtplib.SMTP_SSL(settings.smtp_host, 465, timeout=30) as server:
                server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        
        print(f"[Email] Sent missing highlights notification for {len(missing_matches)} matches")
        return True
        
    except Exception as e:
        print(f"[Email] Failed to send notification: {e}")
        return False
