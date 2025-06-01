import { NextResponse } from 'next/server';
import { designCreateSchema } from '@/src/app/components/design/types';
import { getDatabase } from "../../lib/betterSqlite3"
import log from "electron-log/renderer";

// TODO: Move this to a shared location
const platformMap = {
  1: 'PUBMAN',
  2: 'DUMMY',
  3: 'THINGIVERSE',
  4: 'PRINTABLES',
  5: 'MAKERWORLD',
}

const PLATFORM_PUBMAN = 1;

export async function GET(request) {
  try {
    const db = getDatabase();
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

    // Fetch the designs
    const designs = db.prepare(`
        SELECT id, main_name, summary, description, license_key, thingiverse_category, printables_category, makerworld_category, is_ready, is_published,
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

      // Fetch assets
      const assets = db
        .prepare(
          `SELECT id, file_name, file_ext, file_path,
                  strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at
           FROM design_asset 
           WHERE design_id = ? AND deleted_at IS NULL`
        )
        .all(design.id);

      // Fetch platform publishing information
      const platforms = db
        .prepare(
          `SELECT platform_id, platform_design_id, published_status,
                  strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at,
                  strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at,
                  strftime('%Y-%m-%dT%H:%M:%fZ', published_at) as published_at
           FROM design_platform
           WHERE design_id = ? AND deleted_at IS NULL`
        )
        .all(design.id);

      return {
        id: design.id.toString(),
        main_name: design.main_name,
        summary: design.summary,
        description: design.description,
        license_key: design.license_key,
        thingiverse_category: design.thingiverse_category || null,
        printables_category: design.printables_category || null,
        makerworld_category: design.makerworld_category || null,
        is_ready: Boolean(design.is_ready),
        is_published: Boolean(design.is_published),
        created_at: design.created_at,
        updated_at: design.updated_at,
        tags: tags.map((tag) => ({
          tag: tag.tag,
          platform: platformMap[tag.platform_id] || 'UNKNOWN',
        })),
        thumbnail: assets.filter((asset) => ["jpg", "jpeg", "png"].includes(asset.file_ext.toLowerCase())).map(asset => `local://${asset.file_path}`)[0] || null,
        assets: assets.map((asset) => ({
          id: asset.id.toString(),
          file_name: asset.file_name,
          file_ext: asset.file_ext,
          url: `local://${asset.file_path}`,
          created_at: asset.created_at,
        })),
        platforms: platforms.map((platform) => ({
          platform: platformMap[platform.platform_id] || 'UNKNOWN',
          platform_design_id: platform.platform_design_id,
          published_status: platform.published_status,
          created_at: platform.created_at,
          updated_at: platform.updated_at,
          published_at: platform.published_at,
        })),
      };
    });

    return NextResponse.json(fullDesigns, { status: 200 });
  } catch (error) {
    log.error('Failed to retrieve designs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const db = getDatabase();
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

    // Insert the new design
    const insertDesign = db.prepare(`
      INSERT INTO design (designer_id, main_name, summary, description, license_key, thingiverse_category, printables_category, makerworld_category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const result = insertDesign.run(
      designer.id,
      data.main_name,
      data.summary,
      data.description,
      data.license_key || 'SDFL',
      data.thingiverse_category || null,
      data.printables_category || null,
      data.makerworld_category || null
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

    // Fetch the created design
    const createdDesign = db
      .prepare(
        `SELECT id, main_name, summary, description, license_key, created_at, updated_at
         FROM design WHERE id = ?`
      )
      .get(designId);

    return NextResponse.json(createdDesign, { status: 201 });
  } catch (error) {
    log.error('Failed to create design:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
