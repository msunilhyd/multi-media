import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { home_team, away_team, video_id, match_date } = body;

    if (!home_team || !away_team || !video_id || !match_date) {
      return NextResponse.json(
        { error: 'Missing required fields: home_team, away_team, video_id, match_date' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      home_team,
      away_team,
      video_id,
      match_date,
    });

    const response = await fetch(
      `${BACKEND_URL}/api/admin/add-highlight-by-video-id?${params}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding highlight:', error);
    return NextResponse.json(
      { error: 'Failed to add highlight' },
      { status: 500 }
    );
  }
}
