import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const matchDate = searchParams.get('match_date');
  const teams = searchParams.get('teams');
  
  // Require match_date parameter - no "show all" functionality
  if (!matchDate) {
    return NextResponse.json(
      { error: 'match_date parameter is required' },
      { status: 400 }
    );
  }
  
  const params = new URLSearchParams();
  params.append('match_date', matchDate);
  if (teams) params.append('teams', teams);
  
  const url = `${BACKEND_URL}/api/highlights?${params}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch highlights' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching highlights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
