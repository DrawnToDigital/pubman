import {getDatabase} from "../../../../lib/betterSqlite3";
import {NextResponse} from "next/server";
import log from "electron-log/renderer";

const PROVIDER_NAME = 'makerworld';

export async function GET() {
  try {
    const db = getDatabase();
    const row = await db.prepare('SELECT token FROM auth_tokens WHERE provider = ? ORDER BY updated_at DESC, created_at DESC').get(PROVIDER_NAME);

    if (row) {
      return NextResponse.json({ token: row.token });
    } else {
      return NextResponse.json({ token: null });
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

    await db.prepare('INSERT OR REPLACE INTO auth_tokens (provider, token) VALUES (?, ?)').run(PROVIDER_NAME, token);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Failed to save token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = getDatabase();
    await db.prepare('DELETE FROM auth_tokens WHERE provider = ?').run(PROVIDER_NAME);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Failed to delete token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}