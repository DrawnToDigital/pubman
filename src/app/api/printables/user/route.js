import { NextResponse } from 'next/server';
import { PrintablesAPI } from '../printables-lib';
import log from "electron-log/renderer";

export async function GET(request) {
  try {
    const accessToken = request.headers.get('x-printables-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Printables access token' }, { status: 401 });
    }

    const api = new PrintablesAPI(accessToken);
    const userData = await api.getUserInfo();

    return NextResponse.json(userData, { status: 200 });
  } catch (error) {
    log.error('Failed to get Printables user info:', error);

    // Check if the error is due to an invalid token
    if (error.message && error.message.includes('401')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}