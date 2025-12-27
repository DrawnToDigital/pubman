import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/betterSqlite3";
import log from "electron-log/renderer";

const MAKERWORLD_PLATFORM_ID = 5;
const PUBLISHED_STATUS_DRAFT = 1;
const PUBLISHED_STATUS_PUBLISHED = 2;

export async function POST(request) {
  try {
    const { designId, platformDesignId, status } = await request.json();

    if (!designId || !platformDesignId || !status) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const db = getDatabase();
    const publishedStatus = status === 'published' ? PUBLISHED_STATUS_PUBLISHED : PUBLISHED_STATUS_DRAFT;

    // Check if record exists
    const existing = db.prepare(`
      SELECT id FROM design_platform
      WHERE platform_id = ? AND design_id = ?
    `).get(MAKERWORLD_PLATFORM_ID, designId);

    if (existing) {
      // Update existing record
      if (status === 'published') {
        db.prepare(`
          UPDATE design_platform
          SET published_status = ?, platform_design_id = ?, updated_at = datetime('now'), published_at = datetime('now')
          WHERE platform_id = ? AND design_id = ?
        `).run(publishedStatus, platformDesignId, MAKERWORLD_PLATFORM_ID, designId);
      } else {
        db.prepare(`
          UPDATE design_platform
          SET published_status = ?, platform_design_id = ?, updated_at = datetime('now')
          WHERE platform_id = ? AND design_id = ?
        `).run(publishedStatus, platformDesignId, MAKERWORLD_PLATFORM_ID, designId);
      }
    } else {
      // Insert new record
      db.prepare(`
        INSERT INTO design_platform (platform_id, design_id, platform_design_id, published_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(MAKERWORLD_PLATFORM_ID, designId, platformDesignId, publishedStatus);
    }

    log.info(`MakerWorld record updated: designId=${designId}, platformDesignId=${platformDesignId}, status=${status}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Failed to record MakerWorld status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
