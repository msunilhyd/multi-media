import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/sample-playlists/${params.id}`, { cache: 'no-store' });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch admin playlist' }, { status: response.status === 404 ? 404 : 502 });
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: 'Failed to fetch admin playlist' }, { status: 500 });
  }
}
