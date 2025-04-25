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
  const { designID, assetID } = await context.params; // Await params
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
  const asset = db.prepare(`
    SELECT id, file_name, file_ext, file_path AS url,
           strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at
    FROM design_asset
    WHERE design_id = ? AND id = ? AND deleted_at IS NULL
  `).all(designID, assetID);

  return NextResponse.json(asset);
}

export async function DELETE(request, context) {
  const { designID, assetID } = await context.params; // Await params
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
    WHERE id = ? AND designer_id = ?
  `).get(designID, designer.id);

  if (!design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  const asset = db.prepare(`
    SELECT id FROM design_asset
    WHERE id = ? AND design_id = ? AND deleted_at IS NULL
  `).get(assetID, designID);
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  try {
    db.prepare(`
      UPDATE design_asset
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(asset.id);

    return NextResponse.json({ message: 'Design deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete design:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}