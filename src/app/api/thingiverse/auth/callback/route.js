import { NextResponse } from 'next/server';
import {getDatabase} from "../../../../lib/betterSqlite3";

// Replace these with your actual values
const THINGIVERSE_CLIENT_ID = process.env.THINGIVERSE_CLIENT_ID;
const THINGIVERSE_CLIENT_SECRET = process.env.THINGIVERSE_CLIENT_SECRET;

export async function GET(request) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Authorization code not provided' }, { status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.thingiverse.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: THINGIVERSE_CLIENT_ID,
        client_secret: THINGIVERSE_CLIENT_SECRET,  // NOTE: This should not be exposed in client-side code
        code,
        redirect_uri: process.env.THINGIVERSE_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    // The response will be in URL encoded form.
    //
    // ie access_token=e72e16c7e42f292c6912e7710c838347ae178b4a&token_type=bearer

    const tokenData = await tokenResponse.text();
    const params = new URLSearchParams(tokenData);
    const accessToken = params.get('access_token');
    if (!accessToken) {
      throw new Error(`Invalid token response: ${tokenData}`);
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