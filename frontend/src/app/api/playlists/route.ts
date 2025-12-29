import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('GET /api/playlists - Session:', JSON.stringify(session, null, 2));
    console.log('GET /api/playlists - Has accessToken:', !!(session as any)?.accessToken);
    
    if (!session || !(session as any).accessToken) {
      console.error('GET /api/playlists - Auth failed. Session exists:', !!session, 'AccessToken exists:', !!(session as any)?.accessToken);
      return NextResponse.json(
        { error: 'Unauthorized', debug: { hasSession: !!session, hasToken: !!(session as any)?.accessToken } },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const playlistType = searchParams.get('playlist_type');
    
    const url = new URL(`${BACKEND_URL}/api/playlists/`);
    if (playlistType) {
      url.searchParams.set('playlist_type', playlistType);
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${(session as any).accessToken}`,
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('POST /api/playlists - Session:', JSON.stringify(session, null, 2));
    console.log('POST /api/playlists - Has accessToken:', !!(session as any)?.accessToken);
    
    if (!session || !(session as any).accessToken) {
      console.error('POST /api/playlists - Auth failed. Session exists:', !!session, 'AccessToken exists:', !!(session as any)?.accessToken);
      return NextResponse.json(
        { error: 'Unauthorized', debug: { hasSession: !!session, hasToken: !!(session as any)?.accessToken } },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/playlists/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(session as any).accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    );
  }
}
