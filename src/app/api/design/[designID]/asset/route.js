import { NextResponse } from 'next/server';
import {z} from "zod";
import { getDatabase } from "../../../../lib/betterSqlite3";
import log from "electron-log/renderer"
import path from 'path';

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
    SELECT id, file_name, file_ext, file_path, original_file_path, original_file_size, original_file_mtime,
           strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at
    FROM design_asset
    WHERE design_id = ? AND deleted_at IS NULL
  `).all(designID);

  return NextResponse.json(assets);
}

const assetCreateSchema = z.object({
  file_name: z.string(),
  file_ext: z.string(),
  file_path: z.string(),
  original_file_path: z.string().nullish(),
  original_file_size: z.number().nullish(),
  original_file_mtime: z.string().nullish(),
});

export async function POST(request, context) {
  const { designID } = await context.params; // Await params
  const db = getDatabase();

  const username = request.headers.get('x-username') || 'default';
  const body  = await request.json();
  const data = assetCreateSchema.parse(body);
  const { file_name: fileName, file_ext: fileExt, file_path: filePathAbs, original_file_path, original_file_size, original_file_mtime } = data;
  // Use Node.js path module for platform-safe normalization
  let filePath = path.normalize(filePathAbs);
  const assetsPrefix = path.join(path.sep, 'assets', path.sep);
  const idx = filePath.indexOf(assetsPrefix);
  if (idx !== -1) filePath = filePath.slice(idx);

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
    INSERT INTO design_asset (design_id, designer_id, file_name, file_ext, file_path, original_file_path, original_file_size, original_file_mtime, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      designID,
      designer.id,
      fileName,
      fileExt,
      filePath,
      original_file_path || null,
      original_file_size || null,
      original_file_mtime || null
    );

    db.prepare(
      `UPDATE design SET updated_at = datetime('now') WHERE id = ? AND designer_id = ?`
    ).run(designID, designer.id)

    return NextResponse.json({ message: 'File metadata added successfully' }, { status: 200 });
  } catch (error) {
    log.error('Failed to add file metadata:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}