import { NextResponse } from 'next/server';
import { getDatabase } from "../../../../../lib/betterSqlite3";
import log from "electron-log/renderer";

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

  // Fetch asset
  const asset = db.prepare(`
    SELECT id, file_name, file_ext, file_path,
           strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at
    FROM design_asset
    WHERE design_id = ? AND id = ? AND deleted_at IS NULL
  `).get(designID, assetID);

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

    db.prepare(
      `UPDATE design SET updated_at = datetime('now') WHERE id = ? AND designer_id = ?`
    ).run(designID, designer.id)

    return NextResponse.json({ message: 'Asset deleted successfully' }, { status: 200 });
  } catch (error) {
    log.error('Failed to delete asset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}