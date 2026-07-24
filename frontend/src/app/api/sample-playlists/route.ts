import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/sample-playlists`, { cache: 'no-store' });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch admin playlists' }, { status: 502 });
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: 'Failed to fetch admin playlists' }, { status: 500 });
  }
}
