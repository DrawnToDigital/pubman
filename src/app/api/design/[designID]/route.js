import {NextResponse} from 'next/server';
import {getDatabase} from "../../../lib/betterSqlite3";
import {designUpdateSchema} from "../../../components/design/types";
import log from "electron-log/renderer";

// TODO: Move this to a shared location
// Map platform IDs to readable names
const platformMap = {
  1: 'PUBMAN',
  2: 'DUMMY',
  3: 'THINGIVERSE',
  4: 'PRINTABLES',
  5: 'MAKERWORLD'
}

const PLATFORM_PUBMAN = 1;

export async function GET(request, {params}) {
  try {
    const {designID} = await params;
    const db = getDatabase();

    // Fetch the basic design information
    const design = db.prepare(`
        SELECT id,
               designer_id,
               main_name,
               summary,
               description,
               license_key,
               thingiverse_category,
               printables_category,
               makerworld_category,
               is_ready,
               is_published,
               strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at,
               strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) AS updated_at
        FROM design
        WHERE id = ?
          AND deleted_at IS NULL
    `).get(designID);

    if (!design) {
      return NextResponse.json({error: 'Design not found'}, {status: 404});
    }

    // Fetch tags
    const tags = db.prepare(`
        SELECT tag, platform_id
        FROM design_tag
        WHERE design_id = ?
          AND deleted_at IS NULL
    `).all(design.id);

    // Fetch assets
    const assets = db.prepare(`
          SELECT id, file_name, file_ext, file_path,
                 strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at
          FROM design_asset 
          WHERE design_id = ? AND deleted_at IS NULL
        `).all(design.id);

    // Fetch platform publishing information
    const platforms = db.prepare(`
          SELECT platform_id, design_id, platform_design_id, published_status,
                 strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at,
                 strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at,
                 strftime('%Y-%m-%dT%H:%M:%fZ', published_at) as published_at
          FROM design_platform
          WHERE design_id = ? AND deleted_at IS NULL
        `).all(design.id);

    // Format the complete design response
    const fullDesign = {
      id: design.id.toString(),
      designer_id: design.designer_id,
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
      }))
    };

    return NextResponse.json(fullDesign, {status: 200});
  } catch (error) {
    log.error('Failed to retrieve design:', error);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
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

  const data = designUpdateSchema.parse(await request.json());
  const { main_name, summary, description, license_key, thingiverse_category, printables_category, makerworld_category, tags: tagsRaw } = data;

  try {
    db.prepare(`
      UPDATE design
      SET main_name = ?, summary = ?, description = ?, license_key = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(main_name, summary, description, license_key, design.id);

    if (typeof thingiverse_category !== "undefined" && thingiverse_category !== null) {
      // Update thingiverse_category
      const updateCategory = db.prepare(`
        UPDATE design
        SET thingiverse_category = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateCategory.run(thingiverse_category, design.id);
    }
    if (typeof printables_category !== "undefined" && printables_category !== null) {
      // Update printables_category
      const updateCategory = db.prepare(`
        UPDATE design
        SET printables_category = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateCategory.run(printables_category, design.id);
    }
    if (typeof makerworld_category !== "undefined" && makerworld_category !== null) {
      // Update makerworld_category
      const updateCategory = db.prepare(`
        UPDATE design
        SET makerworld_category = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateCategory.run(makerworld_category, design.id);
    }

    if (typeof tagsRaw !== 'undefined' && tagsRaw !== null) {
      db.prepare(`
        UPDATE design_tag SET deleted_at = datetime('now')
        WHERE design_id = ? AND deleted_at IS NULL
      `).run(design.id);

      const insertTag = db.prepare(`
        INSERT INTO design_tag (design_id, tag, platform_id, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      const uniqueTags = [... new Set(tagsRaw.split(',').map(tag => tag.trim()))];
      uniqueTags.forEach((tag) => {
        insertTag.run(design.id, tag.trim(), PLATFORM_PUBMAN);
      });
    }

    return NextResponse.json({ message: 'Design updated successfully' }, { status: 200 });
  } catch (error) {
    log.error('Failed to update design:', error);
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
    log.error('Failed to delete design:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
