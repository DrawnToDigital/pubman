import { NextResponse } from 'next/server';
import { getDatabase } from "../../../../lib/betterSqlite3";
import { ThingiverseAPI } from '../../thingiverse-lib';

export async function POST() {
  try {
    // Get current token from database
    const db = getDatabase();
    const tokenRow = await db.prepare('SELECT token FROM auth_tokens WHERE provider = ?').get('thingiverse');

    if (!tokenRow || !tokenRow.token) {
      return NextResponse.json({ error: 'No existing token found' }, { status: 404 });
    }

    const currentToken = tokenRow.token;

    // Check if the token is still valid by making a request to Thingiverse API
    const api = new ThingiverseAPI(currentToken);

    try {
      // Try to get token info to check validity
      await api.getAuthTokenInfo();
      console.log("Token is still valid");

      // If no error is thrown, token is still valid
      return NextResponse.json({ success: true, message: 'Token is still valid' });
    } catch (tokenError) {
      // Token is invalid or expired, need to get a new one
      // Unfortunately, Thingiverse OAuth doesn't support refresh tokens without user interaction
      // We need to tell the client to initiate a new auth flow
      console.error('Token refresh error:', tokenError);

      // Delete the invalid token
      await db.prepare('DELETE FROM auth_tokens WHERE provider = ?').run('thingiverse');
      console.log('Deleted invalid token from database');

      return NextResponse.json(
        {
          error: 'Token expired',
          message: 'Token has expired. User needs to re-authenticate.',
          requiresReauth: true
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}