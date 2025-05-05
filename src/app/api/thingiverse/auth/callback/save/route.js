import { NextResponse } from 'next/server';
import {getDatabase} from "../../../../../lib/betterSqlite3";

const THINGIVERSE_CLIENT_ID = process.env.THINGIVERSE_CLIENT_ID;

export async function GET(request) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token');

    if (!accessToken) {
      return NextResponse.json({ error: 'Authorization accessToken not provided' }, { status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.thingiverse.com/login/oauth/tokeninfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        access_token: accessToken,
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData || !tokenData.audience || tokenData.audience !== THINGIVERSE_CLIENT_ID) {

      throw new Error('Invalid token response');
    }

    // Store token in database
    await db.prepare('INSERT OR REPLACE INTO auth_tokens (provider, token) VALUES (?, ?)').run('thingiverse', accessToken);

    // Return an HTML page that closes itself and sends a message to the parent window
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
        </head>
        <body>
          <h1>Authentication Successful</h1>
          <p>You can close this window now.</p>
          <script>
            window.opener.postMessage({ type: 'THINGIVERSE_AUTH_SUCCESS', token: '${accessToken}' }, '*');
            window.close();
          </script>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}