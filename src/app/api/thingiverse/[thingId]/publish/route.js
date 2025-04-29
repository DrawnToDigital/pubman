import { NextResponse } from 'next/server';
import { ThingiverseAPI } from '../../lib';

export async function POST(request, { params }) {
  try {
    const { thingId } = params;
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    const api = new ThingiverseAPI(accessToken);
    const result = await api.publishThing(thingId);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Failed to publish Thingiverse thing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}