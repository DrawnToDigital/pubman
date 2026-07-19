import {getDatabase} from "../../../../lib/betterSqlite3";
import {NextResponse} from "next/server";
import log from "electron-log/renderer";

export async function GET() {
  try {
    const db = getDatabase();
    const row = await db.prepare(
      'SELECT token, expires_at FROM auth_tokens WHERE provider = ? ORDER BY updated_at DESC, created_at DESC'
    ).get('printables');

    if (row) {
      // expiresAt lets the client (PrintablesAuthContext) decide whether to call
      // /api/printables/auth/refresh before using this token, instead of waiting for a
      // 401 from Printables itself.
      return NextResponse.json({ token: row.token, expiresAt: row.expires_at });
    } else {
      return NextResponse.json({ token: null, expiresAt: null });
    }
  } catch (error) {
    log.error('Failed to get token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const db = getDatabase();
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    await db.prepare('INSERT OR REPLACE INTO auth_tokens (provider, token) VALUES (?, ?)').run('printables', token);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Failed to save token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = getDatabase();
    await db.prepare('DELETE FROM auth_tokens WHERE provider = ?').run('printables');
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Failed to delete token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}