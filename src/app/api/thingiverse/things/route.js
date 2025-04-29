import {NextResponse} from "next/server";
import {ThingiverseAPI} from "../thingiverse-lib";

export async function GET(request) {
  try {
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    const username = request.nextUrl.searchParams.get('name');
    if (!username) {
      return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
    }

    const api = new ThingiverseAPI(accessToken);
    const things = await api.getThingsByUsername(username);
    return NextResponse.json(things, { status: 200 });
  } catch (error) {
    console.error('Failed to get Thingiverse things:', error);
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