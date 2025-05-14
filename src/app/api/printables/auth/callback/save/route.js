import { NextResponse } from 'next/server';
import {getDatabase} from "../../../../../lib/betterSqlite3";
import log from "electron-log/renderer";

export async function GET(request) {
  try {
    const db = getDatabase();
    const accessToken = request.nextUrl.searchParams.get('access_token');

    if (!accessToken) {
      return NextResponse.json({ error: 'Authorization accessToken not provided' }, { status: 400 });
    }

    // Store token in database
    await db.prepare('INSERT OR REPLACE INTO auth_tokens (provider, token) VALUES (?, ?)').run('printables', accessToken);

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
            window.opener.postMessage({ type: 'PRINTABLES_AUTH_SUCCESS', token: '${accessToken}' }, '*');
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
    log.error('OAuth callback error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}