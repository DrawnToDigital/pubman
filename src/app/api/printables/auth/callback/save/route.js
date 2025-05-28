import { NextResponse } from 'next/server';
import {getDatabase} from "../../../../../lib/betterSqlite3";
import log from "electron-log/renderer";

export async function GET(request) {
  try {
    const db = getDatabase();
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Authorization code not provided' }, { status: 400 });
    }
    const codeVerifier = request.nextUrl.searchParams.get('code_verifier');
    if (!codeVerifier) {
      return NextResponse.json({ error: 'Code verifier not provided' }, { status: 400 });
    }

    const url = 'https://account.prusa3d.com/o/token/'
    const clientId = 'oamhmhZez7opFosnwzElIgE2oGgI2iJORSkw587O'; // PrusaSlicer
    const redirectUri = 'prusaslicer://login';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        scope: 'basic_info',
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      log.error('OAuth token request failed:', errorData);
      return NextResponse.json({ error: 'Failed to obtain access token' }, { status: response.status });
    }
    const data = await response.json();
    log.info('OAuth token response:', data);
    const accessToken = data.access_token;
    if (!accessToken) {
      log.error('Access token missing in OAuth response:', data);
      return NextResponse.json({ error: 'Access token not provided by OAuth server' }, { status: 500 });
    }

    // Store token in database
    await db.prepare('INSERT OR REPLACE INTO auth_tokens (provider, token) VALUES (?, ?)').run('printables', accessToken);

    return NextResponse.json({
      message: 'Authentication successful',
      accessToken,
    });
  } catch (error) {
    log.error('OAuth callback error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}