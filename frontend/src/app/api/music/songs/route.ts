import { NextRequest, NextResponse } from 'next/server';

// Use BACKEND_API_URL (server-only) with fallback to NEXT_PUBLIC_API_URL for compatibility
const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FETCH_TIMEOUT_MS = 10000; // 10 second timeout

export async function GET(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();

    // Forward all query parameters
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    const targetUrl = `${BACKEND_URL}/music/songs?${params.toString()}`;
    console.log(`[music/songs] Fetching from: ${targetUrl}`);

    const response = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[music/songs] Backend error ${response.status}: ${errText}`);
      return NextResponse.json(
        { error: `Backend responded with status ${response.status}`, detail: errText },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    clearTimeout(timeoutId);
    const isTimeout = error?.name === 'AbortError';
    const message = isTimeout
      ? `Backend timed out after ${FETCH_TIMEOUT_MS / 1000}s (URL: ${BACKEND_URL})`
      : `Failed to reach backend at ${BACKEND_URL}: ${error?.message}`;
    console.error(`[music/songs] ${message}`);
    return NextResponse.json(
      { error: 'Failed to fetch songs', detail: message },
      { status: 500 }
    );
  }
}