import { NextResponse } from 'next/server';
import { ThingiverseAPI } from '../../lib';

export async function GET(request, { params }) {
  try {
    const { thingId } = params;
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    const api = new ThingiverseAPI(accessToken);
    const files = await api.getFilesForThing(thingId);

    return NextResponse.json(files, { status: 200 });
  } catch (error) {
    console.error('Failed to get Thingiverse files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { thingId } = params;
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const fileName = formData.get('fileName') || file?.name;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();

    const api = new ThingiverseAPI(accessToken);
    const result = await api.uploadFile(thingId, fileName, Buffer.from(fileBuffer));

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to upload file to Thingiverse:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}