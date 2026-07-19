import { NextResponse } from 'next/server';
import { getDatabase } from "../../../../lib/betterSqlite3";
import { formatApiError } from "../../../../lib/logApiError.js";
import log from "electron-log/node";

export async function POST() {
  try {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT refresh_token FROM auth_tokens WHERE provider = ? ORDER BY updated_at DESC, created_at DESC'
    ).get('printables');

    if (!row || !row.refresh_token) {
      return NextResponse.json(
        { error: 'No refresh token available - user must log in again', requiresReauth: true },
        { status: 404 }
      );
    }

    const url = 'https://account.prusa3d.com/o/token/';
    const clientId = 'oamhmhZez7opFosnwzElIgE2oGgI2iJORSkw587O'; // PrusaSlicer

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: row.refresh_token,
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      log.error('Printables token refresh failed:', errorData);
      // The refresh token itself is dead (expired/revoked) - clear stored tokens so
      // callers know to fall back to the interactive login popup rather than looping
      // on a refresh that will never succeed.
      db.prepare('DELETE FROM auth_tokens WHERE provider = ?').run('printables');
      return NextResponse.json(
        { error: 'Refresh token expired or revoked', requiresReauth: true },
        { status: 401 }
      );
    }

    const data = await response.json();
    log.info('Printables token refresh response:', data);
    const accessToken = data.access_token;
    if (!accessToken) {
      log.error('Access token missing in refresh response:', data);
      return NextResponse.json({ error: 'Access token not provided by OAuth server' }, { status: 500 });
    }

    // Some OAuth servers rotate the refresh_token on every use, others return the same
    // one back (or omit it) - keep the new one if given, otherwise carry the existing
    // one forward so a future refresh still has something to use.
    const newRefreshToken = data.refresh_token || row.refresh_token;
    const expiresAt = typeof data.expires_in === 'number'
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

    db.prepare(
      'INSERT OR REPLACE INTO auth_tokens (provider, token, refresh_token, expires_at) VALUES (?, ?, ?, ?)'
    ).run('printables', accessToken, newRefreshToken, expiresAt);

    return NextResponse.json({ success: true, token: accessToken, expiresAt });
  } catch (error) {
    log.error('Printables token refresh error:', formatApiError(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
