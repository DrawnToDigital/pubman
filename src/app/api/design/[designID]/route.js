import {NextResponse} from 'next/server';
import {getDatabase} from "../../../lib/betterSqlite3";
import {designUpdateSchema} from "../../../components/design/types";

// TODO: Move this to a shared location
// Map platform IDs to readable names
const platformMap = {
  1: 'PUBMAN',
  2: 'DUMMY',
  3: 'THINGIVERSE'
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

    // Fetch categories
    const categories = db.prepare(`
          SELECT c.category, c.platform_id
          FROM design_category dc
          JOIN category c ON dc.category_id = c.id
          WHERE dc.design_id = ? AND dc.deleted_at IS NULL
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
    console.error('Failed to retrieve design:', error);
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
  const { main_name, summary, description, license_key, tags: tagsRaw, category: categoryRaw } = data;

  try {
    db.prepare(`
      UPDATE design
      SET main_name = ?, summary = ?, description = ?, license_key = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(main_name, summary, description, license_key, design.id);

    if (typeof categoryRaw !== "undefined" && categoryRaw !== null) {
      const category = db
        .prepare(
          `SELECT * FROM category WHERE platform_id = ? AND category = ?`
        )
        .get(PLATFORM_PUBMAN, categoryRaw);

      if (!category) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 404 });
      }

      db.prepare(`
        UPDATE design_category SET deleted_at = datetime('now')
        WHERE design_id = ? AND deleted_at IS NULL
      `).run(design.id);


      // Insert category
      const insertCategory = db.prepare(`
        INSERT INTO design_category (design_id, category_id, created_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      insertCategory.run(design.id, category.id);
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