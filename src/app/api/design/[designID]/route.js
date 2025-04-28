import { NextResponse } from 'next/server';
import { getDatabase } from "../../../lib/betterSqlite3";

// TODO: Move this to a shared location
const platformMap = {
  1: 'PUBMAN',
  2: 'DUMMY',
  3: 'THINGIVERSE'
}

export async function GET(request, context) {
  const { designID } = await context.params; // Await params
  const db = getDatabase();

  const username = request.headers.get('x-username') || 'default';

  const designer = db.prepare(`
    SELECT * FROM designer
    WHERE username = ? AND deleted_at IS NULL AND status = 'active'
  `).get(username);

  if (!designer) {
    return NextResponse.json({ error: 'Designer not found' }, { status: 404 });
  }

  const design = db.prepare(`
    SELECT id, main_name, summary, description, license_key, is_ready, is_published,
           strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at,
           strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) AS updated_at
    FROM design
    WHERE id = ? AND deleted_at IS NULL`
  ).get(designID);
  if (!design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  // Fetch tags
  const tags = db.prepare(`
    SELECT tag, platform_id FROM design_tag
    WHERE design_id = ? AND deleted_at IS NULL
  `).all(designID);

  // Fetch categories
  const categories = db.prepare(`
    SELECT c.category, c.platform_id
    FROM design_category dc
    JOIN category c ON dc.category_id = c.id
    WHERE dc.design_id = ? AND dc.deleted_at IS NULL
  `).all(designID);

  // Fetch assets
  const assets = db.prepare(`
    SELECT id, file_name, file_ext, file_path,
           strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at
    FROM design_asset
    WHERE design_id = ? AND deleted_at IS NULL
  `).all(designID);

  // Construct the full design schema
  const fullDesign = {
    id: design.id.toString(),
    main_name: design.main_name,
    summary: design.summary,
    description: design.description,
    license_key: design.license_key,
    is_ready: Boolean(design.is_ready),
    is_published: Boolean(design.is_published),
    created_at: design.created_at,
    updated_at: design.updated_at,
    tags: tags.map((tag) => ({
      tag: tag.tag,
      platform: platformMap[tag.platform_id] || 'UNKNOWN',
    })),
    categories: categories.map((category) => ({
      category: category.category,
      platform: platformMap[category.platform_id] || 'UNKNOWN',
    })),
    assets: assets.map((asset) => ({
      id: asset.id.toString(),
      file_name: asset.file_name,
      file_ext: asset.file_ext,
      url: `local://${asset.file_path}`,
      created_at: asset.created_at,
    })),
  };

  return NextResponse.json(fullDesign, { status: 200 });
}

export async function PUT(request, context) {
  const { designID } = await context.params; // Await params
  const db = getDatabase();

  const username = request.headers.get('x-username') || 'default';

  const designer = db.prepare(`
    SELECT * FROM designer
    WHERE username = ? AND deleted_at IS NULL AND status = 'active'
  `).get(username);

  if (!designer) {
    return NextResponse.json({ error: 'Designer not found' }, { status: 404 });
  }

  const design = db.prepare(`
    SELECT * FROM design
    WHERE id = ? AND designer_id = ?
  `).get(designID, designer.id);

  if (!design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  const data = await request.json();
  const { mainName, summary, description, licenseKey } = data;

  try {
    db.prepare(`
      UPDATE design
      SET main_name = ?, summary = ?, description = ?, license_key = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(mainName, summary, description, licenseKey, design.id);

    return NextResponse.json({ message: 'Design updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update design:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const { designID } = await context.params; // Await params
  const db = getDatabase();

  const username = request.headers.get('x-username') || 'default';

  const designer = db.prepare(`
    SELECT * FROM designer
    WHERE username = ? AND deleted_at IS NULL AND status = 'active'
  `).get(username);

  if (!designer) {
    return NextResponse.json({ error: 'Designer not found' }, { status: 404 });
  }

  const design = db.prepare(`
    SELECT * FROM design
    WHERE id = ? AND designer_id = ?
  `).get(designID, designer.id);

  if (!design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  try {
    db.prepare(`
      UPDATE design
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(design.id);

    return NextResponse.json({ message: 'Design deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete design:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}