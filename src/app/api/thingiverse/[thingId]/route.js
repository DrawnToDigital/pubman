import { NextResponse } from 'next/server';
import { ThingiverseAPI } from '../lib';

export async function GET(request, { params }) {
  try {
    const { thingId } = params;
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    const api = new ThingiverseAPI(accessToken);
    const thing = await api.getThingById(thingId);

    return NextResponse.json(thing, { status: 200 });
  } catch (error) {
    console.error('Failed to get Thingiverse thing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { thingId } = params;
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    const api = new ThingiverseAPI(accessToken);
    const updates = await request.json();

    const updatedThing = await api.updateThing(thingId, updates);
    return NextResponse.json(updatedThing, { status: 200 });
  }  catch (error) {
    console.error('Failed to update Thingiverse thing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}