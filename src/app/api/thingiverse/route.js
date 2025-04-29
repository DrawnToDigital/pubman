import { NextResponse } from 'next/server';
import { ThingiverseAPI } from './lib';

export async function GET(request) {
  try {
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    const api = new ThingiverseAPI(accessToken);
    const username = request.nextUrl.searchParams.get('username');

    if (username) {
      // Get things by username
      const things = await api.getThingsByUsername(username);
      return NextResponse.json(things, { status: 200 });
    } else {
      // Get user info
      const userInfo = await api.getUserInfo();
      return NextResponse.json(userInfo, { status: 200 });
    }
  } catch (error) {
    console.error('Thingiverse API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    const api = new ThingiverseAPI(accessToken);
    const thingData = await request.json();

    const newThing = await api.createThing(thingData);
    return NextResponse.json(newThing, { status: 201 });
  } catch (error) {
    console.error('Failed to create Thingiverse thing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}