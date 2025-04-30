import { NextResponse } from 'next/server';
import { ThingiverseAPI } from '../thingiverse-lib';

export async function GET(request) {
  try {
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    const api = new ThingiverseAPI(accessToken);
    const userData = await api.getUserInfo();

    return NextResponse.json(userData, { status: 200 });
  } catch (error) {
    console.error('Failed to get Thingiverse user info:', error);

    // Check if the error is due to an invalid token
    if (error.message && error.message.includes('401')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}