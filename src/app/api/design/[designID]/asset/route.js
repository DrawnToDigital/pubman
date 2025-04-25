import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

function getDatabase() {
  try {
    return new Database('db/pubman.db');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error('Database initialization failed');
  }
}

export async function GET(request, context) {
  const { designID } = await context.params; // Await params
  const db = getDatabase();

  const username = request.headers.get('x-username') || 'default';

  const designer = db.prepare(`
    SELECT id FROM designer
    WHERE username = ? AND deleted_at IS NULL AND status = 'active'
  `).get(username);

  if (!designer) {
    return NextResponse.json({ error: 'Designer not found' }, { status: 404 });
  }

  const design = db.prepare(`
    SELECT id FROM design
    WHERE id = ? AND deleted_at IS NULL`
  ).get(designID);
  if (!design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  // Fetch assets
  const assets = db.prepare(`
    SELECT id, file_name, mime_type, file_path AS url,
           strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at
    FROM design_asset
    WHERE design_id = ? AND deleted_at IS NULL
  `).all(designID);

  return NextResponse.json(assets);
}

export async function POST(request, context) {
  const { designID } = await context.params; // Await params
  const db = getDatabase();

  const username = request.headers.get('x-username') || 'default';
  const { fileName, mimeType, filePath } = await request.json();

  const designer = db.prepare(`
    SELECT id FROM designer
    WHERE username = ? AND deleted_at IS NULL AND status = 'active'
  `).get(username);

  if (!designer) {
    return NextResponse.json({ error: 'Designer not found' }, { status: 404 });
  }

  const design = db.prepare(`
    SELECT id FROM design
    WHERE id = ? AND deleted_at IS NULL`
  ).get(designID);
  if (!design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  // Add file metadata to design_asset
  try {
    db.prepare(`
    INSERT INTO design_asset (design_id, file_name, mime_type, file_path, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(designID, fileName, mimeType, filePath);

    return NextResponse.json({ message: 'File metadata added successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to add file metadata:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}