import { NextResponse } from 'next/server';
import {getDatabase} from "../../../../lib/betterSqlite3";

export async function GET() {
  try {
    const db = getDatabase();
    const row = await db.prepare('SELECT token FROM auth_tokens WHERE provider = ?').get('thingiverse');

    if (row) {
      return NextResponse.json({ token: row.token });
    } else {
      return NextResponse.json({ token: null });
    }
  } catch (error) {
    console.error('Failed to get token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = getDatabase();
    await db.prepare('DELETE FROM auth_tokens WHERE provider = ?').run('thingiverse');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}