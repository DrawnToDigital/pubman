import { NextResponse } from 'next/server';
import { MakerWorldAPI, MakerWorldAPIError } from '../makerworld-lib';
import log from "electron-log/renderer";

export async function GET(request) {
  try {
    const accessToken = request.headers.get('x-makerworld-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing MakerWorld access token' }, { status: 401 });
    }

    const api = new MakerWorldAPI(accessToken);
    const userData = await api.getUserInfo();

    return NextResponse.json(userData, { status: 200 });
  } catch (error) {
    log.error('Failed to get MakerWorld user info:', error);

    // Check if the error is due to an invalid token
    if (error instanceof MakerWorldAPIError && error.statusCode === 401) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}