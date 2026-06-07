import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FETCH_TIMEOUT_MS = 5000;

export async function GET() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const result = {
    status: 'unknown' as 'ok' | 'error',
    backendUrl: BACKEND_URL,
    backendReachable: false,
    backendStatus: null as number | null,
    error: null as string | null,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${BACKEND_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);

    result.backendStatus = response.status;
    result.backendReachable = response.ok;
    result.status = response.ok ? 'ok' : 'error';

    if (!response.ok) {
      result.error = `Backend health check failed with status ${response.status}`;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    result.status = 'error';
    result.error = error?.name === 'AbortError'
      ? `Backend timed out after ${FETCH_TIMEOUT_MS / 1000}s`
      : `Cannot reach backend: ${error?.message}`;
  }

  return NextResponse.json(result, {
    status: result.status === 'ok' ? 200 : 503,
  });
}
