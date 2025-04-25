import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { designCreateSchema } from '@/src/app/components/design/types';

let db;
try {
  db = new Database('db/pubman.db');
} catch (error) {
  console.error('Failed to initialize database:', error);
  throw new Error('Database initialization failed');
}

// TODO: Move this to a shared location
const patformMap = {
  1: 'PUBMAN',
  2: 'DUMMY',
  3: 'THINGIVERSE'
}

const PLATFORM_PUBMAN = 1;

export async function GET(request) {
  const username = request.headers.get('x-username') || 'default';

  try {
    // Fetch the designer
    const designer = db
      .prepare(
        `SELECT * FROM designer WHERE username = ? AND deleted_at IS NULL AND status = 'active'`
      )
      .get(username);

    if (!designer) {
      return NextResponse.json({ error: 'Designer not found' }, { status: 404 });
    }

    // Fetch the designs
    const designs = db.prepare(`
        SELECT id, main_name, summary, description, license_key, is_ready, is_published,
               strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at,
               strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) AS updated_at
        FROM design
        WHERE designer_id = ? AND deleted_at IS NULL`
      )
      .all(designer.id);

    // Populate full designSchema for each design
    const fullDesigns = designs.map((design) => {
      // Fetch tags
      const tags = db
        .prepare(
          `SELECT tag, platform_id FROM design_tag 
           WHERE design_id = ? AND deleted_at IS NULL`
        )
        .all(design.id);

      // Fetch categories
      const categories = db
        .prepare(
          `SELECT c.category, c.platform_id
           FROM design_category dc
           JOIN category c ON dc.category_id = c.id
           WHERE dc.design_id = ? AND dc.deleted_at IS NULL`
        )
        .all(design.id);

      // Fetch assets
      const assets = db
        .prepare(
          `SELECT id, file_name, mime_type, file_path AS url,
                  strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at
           FROM design_asset 
           WHERE design_id = ? AND deleted_at IS NULL`
        )
        .all(design.id);

      return {
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
          platform: patformMap[tag.platform_id] || 'UNKNOWN',
        })),
        categories: categories.map((category) => ({
          category: category.category,
          platform: patformMap[category.platform_id] || 'UNKNOWN',
        })),
        assets: assets.map((asset) => ({
          id: asset.id.toString(),
          file_name: asset.file_name,
          mime_type: asset.mime_type,
          url: asset.url,
          created_at: asset.created_at,
        })),
      };
    });

    return NextResponse.json(fullDesigns, { status: 200 });
  } catch (error) {
    console.error('Failed to retrieve designs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate request body using designCreateSchema
    const data = designCreateSchema.parse(body);

    const username = request.headers.get('x-username') || 'default';

    // Fetch the designer
    const designer = db
      .prepare(
        `SELECT * FROM designer WHERE username = ? AND deleted_at IS NULL AND status = 'active'`
      )
      .get(username);

    if (!designer) {
      return NextResponse.json({ error: 'Designer not found' }, { status: 404 });
    }

    // Validate category or default to "Other"
    const category = db
      .prepare(
        `SELECT * FROM category WHERE platform_id = ? AND category = ?`
      )
      .get(PLATFORM_PUBMAN, data.category || 'Other');

    if (!category) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 404 });
    }

    // Insert the new design
    const insertDesign = db.prepare(`
      INSERT INTO design (designer_id, main_name, summary, description, license_key, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const result = insertDesign.run(
      designer.id,
      data.main_name,
      data.summary,
      data.description,
      data.license_key || 'SDFL'
    );

    const designId = result.lastInsertRowid;

    // Insert tags
    const insertTag = db.prepare(`
      INSERT INTO design_tag (design_id, tag, platform_id, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    data.tags.split(',').forEach((tag) => {
      insertTag.run(designId, tag.trim(), PLATFORM_PUBMAN);
    });

    // Insert category
    const insertCategory = db.prepare(`
      INSERT INTO design_category (design_id, category_id, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    insertCategory.run(designId, category.id);

    // Fetch the created design
    const createdDesign = db
      .prepare(
        `SELECT id, main_name, summary, description, license_key, created_at, updated_at
         FROM design WHERE id = ?`
      )
      .get(designId);

    return NextResponse.json(createdDesign, { status: 201 });
  } catch (error) {
    console.error('Failed to create design:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}