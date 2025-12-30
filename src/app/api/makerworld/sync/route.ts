import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "../../../lib/betterSqlite3";
import { makerWorldLicenseToPubman, makerWorldCategoryIdToPubman } from "../makerworld-lib";
import { PLATFORM_IDS, PUBLISHED_STATUS } from "../../../lib/constants/platforms";
import log from "electron-log/renderer";
import path from "path";

interface MakerWorldDesignData {
  id: number;           // MakerWorld internal ID (used for drafts and API calls)
  designId: number;     // MakerWorld public design ID (shown in URLs, 0 if unpublished)
  title: string;
  categoryId: number;
  tags: string[];
  license: string;
  cover: string;
  createTime: string;
  updateTime: string;
}

interface AssetData {
  fileName: string;
  fileExt: string;
  filePath: string;      // Absolute path where file was saved
  originalUrl?: string;  // Original URL from MakerWorld
  fileSize?: number;     // File size in bytes
}

interface MergeConfig {
  syncName: boolean;
  syncDescription: boolean;
  syncLicense: boolean;
  syncCategory: boolean;
  syncTags: boolean;
  appendTags: boolean;
  syncAssets: boolean;
  skip: boolean;
}

interface SyncRequestBody {
  design: MakerWorldDesignData;
  assets?: AssetData[];
  description?: string;  // HTML description (MakerWorld calls this "details")
  mergeConfig?: MergeConfig;  // Config for selective field sync
}

/**
 * POST /api/makerworld/sync
 * Syncs a single MakerWorld design to PubMan
 * Creates a new design or updates an existing one
 */
export async function POST(request: NextRequest) {
  try {
    const body: SyncRequestBody = await request.json();
    const { design, assets = [], description = "", mergeConfig } = body;

    // If mergeConfig.skip is true, return early
    if (mergeConfig?.skip) {
      return NextResponse.json({
        success: true,
        designId: "0",
        isNew: false,
        skipped: true,
      });
    }

    if (!design || !design.id) {
      return NextResponse.json({ error: "Missing design data" }, { status: 400 });
    }

    const db = getDatabase();
    const username = request.headers.get("x-username") || "default";

    // Get the designer
    const designer = db.prepare(`
      SELECT id FROM designer
      WHERE username = ? AND deleted_at IS NULL AND status = 'active'
    `).get(username) as { id: number } | undefined;

    if (!designer) {
      return NextResponse.json({ error: "Designer not found" }, { status: 404 });
    }

    // Map MakerWorld data to PubMan format
    const pubmanLicense = makerWorldLicenseToPubman(design.license);
    const pubmanCategory = makerWorldCategoryIdToPubman(design.categoryId);
    const platformDesignId = design.designId > 0 ? design.designId.toString() : design.id.toString();

    // Check if design already exists in PubMan (linked to this MakerWorld design)
    log.info(`[Sync] Looking for existing design with platform_id=${PLATFORM_IDS.MAKERWORLD}, designId=${design.designId}, id=${design.id}`);

    let existingLink = db.prepare(`
      SELECT dp.design_id, d.id as design_exists
      FROM design_platform dp
      LEFT JOIN design d ON d.id = dp.design_id AND d.deleted_at IS NULL
      WHERE dp.platform_id = ? AND (dp.platform_design_id = ? OR dp.platform_design_id = ?)
        AND dp.deleted_at IS NULL
    `).get(PLATFORM_IDS.MAKERWORLD, design.designId.toString(), design.id.toString()) as { design_id: number; design_exists: number } | undefined;

    log.info(`[Sync] Existing link by platform_design_id:`, existingLink);

    // Fallback: Check if design with same name already exists (for designs created before sync feature)
    if (!existingLink || !existingLink.design_exists) {
      const existingByName = db.prepare(`
        SELECT d.id as design_id, d.id as design_exists
        FROM design d
        WHERE d.designer_id = ? AND d.main_name = ? AND d.deleted_at IS NULL
      `).get(designer.id, design.title) as { design_id: number; design_exists: number } | undefined;

      if (existingByName) {
        log.info(`[Sync] Found existing design by name match: ${existingByName.design_id}`);
        existingLink = existingByName;
      }
    }

    let designId: number;

    if (existingLink && existingLink.design_exists) {
      // Update existing design
      designId = existingLink.design_id;

      // Build selective update based on mergeConfig
      // If no mergeConfig, update all fields (backwards compatibility)
      const shouldSyncName = mergeConfig?.syncName ?? true;
      const shouldSyncDescription = mergeConfig?.syncDescription ?? true;
      const shouldSyncLicense = mergeConfig?.syncLicense ?? true;
      const shouldSyncCategory = mergeConfig?.syncCategory ?? true;

      // Build dynamic SET clause
      const setClauses: string[] = ['updated_at = datetime(\'now\')'];
      const setValues: (string | number)[] = [];

      if (shouldSyncName) {
        setClauses.push('main_name = ?');
        setValues.push(design.title);
      }
      if (shouldSyncDescription) {
        setClauses.push('description = ?');
        setValues.push(description);
      }
      if (shouldSyncLicense) {
        setClauses.push('license_key = ?');
        setValues.push(pubmanLicense || '');
      }
      if (shouldSyncCategory) {
        setClauses.push('makerworld_category = ?');
        setValues.push(pubmanCategory || '');
      }

      setValues.push(designId, designer.id);

      db.prepare(`
        UPDATE design
        SET ${setClauses.join(', ')}
        WHERE id = ? AND designer_id = ?
      `).run(...setValues);

      log.info(`[Sync] Updated design ${designId} with selective fields: name=${shouldSyncName}, description=${shouldSyncDescription}, license=${shouldSyncLicense}, category=${shouldSyncCategory}`);

      // Check if MakerWorld platform link exists for this design
      const existingPlatformLink = db.prepare(`
        SELECT id FROM design_platform
        WHERE platform_id = ? AND design_id = ? AND deleted_at IS NULL
      `).get(PLATFORM_IDS.MAKERWORLD, designId) as { id: number } | undefined;

      if (existingPlatformLink) {
        // Update existing platform link
        db.prepare(`
          UPDATE design_platform
          SET platform_design_id = ?,
              published_status = ?,
              updated_at = datetime('now'),
              published_at = CASE WHEN published_at IS NULL THEN datetime('now') ELSE published_at END
          WHERE platform_id = ? AND design_id = ?
        `).run(platformDesignId, PUBLISHED_STATUS.PUBLISHED, PLATFORM_IDS.MAKERWORLD, designId);
        log.info(`[Sync] Updated platform link for design ${designId}`);
      } else {
        // Create new platform link (design existed but wasn't linked to MakerWorld)
        db.prepare(`
          INSERT INTO design_platform (platform_id, design_id, platform_design_id, published_status, created_at, updated_at, published_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
        `).run(PLATFORM_IDS.MAKERWORLD, designId, platformDesignId, PUBLISHED_STATUS.PUBLISHED);
        log.info(`[Sync] Created platform link for existing design ${designId}`);
      }

      log.info(`[Sync] Updated design ${designId} from MakerWorld ${platformDesignId}`);
    } else {
      // Create new design
      // Generate summary from description (first 200 chars) or use placeholder
      let summary = description ? description.replace(/<[^>]+>/g, '').substring(0, 200).trim() : '';
      if (!summary) {
        summary = 'Imported from MakerWorld';
      }

      const insertResult = db.prepare(`
        INSERT INTO design (designer_id, main_name, summary, description, license_key, makerworld_category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        designer.id,
        design.title,
        summary,
        description,
        pubmanLicense,
        pubmanCategory
      );

      designId = insertResult.lastInsertRowid as number;

      // Create platform link
      db.prepare(`
        INSERT INTO design_platform (platform_id, design_id, platform_design_id, published_status, created_at, updated_at, published_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
      `).run(PLATFORM_IDS.MAKERWORLD, designId, platformDesignId, PUBLISHED_STATUS.PUBLISHED);

      log.info(`[Sync] Created design ${designId} from MakerWorld ${platformDesignId}`);
    }

    // Sync tags (if enabled or new design)
    const isNewDesign = !existingLink || !existingLink.design_exists;
    const shouldSyncTags = isNewDesign || (mergeConfig?.syncTags ?? true);
    if (shouldSyncTags) {
      const effectiveAppendTags = mergeConfig?.appendTags ?? false;
      syncTags(db, designId, design.tags, effectiveAppendTags);
    }

    // Create asset records for downloaded files (if enabled or new design)
    const shouldSyncAssets = isNewDesign || (mergeConfig?.syncAssets ?? true);
    for (const asset of assets) {
      if (!shouldSyncAssets) break;
      createAssetRecord(db, designId, designer.id, asset);
    }

    return NextResponse.json({
      success: true,
      designId: designId.toString(),
      isNew: isNewDesign,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("[Sync] Failed to sync MakerWorld design:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Sync tags from MakerWorld to PubMan
 * @param appendTags - If true, add new tags without removing existing ones
 */
function syncTags(db: ReturnType<typeof getDatabase>, designId: number, tags: string[], appendTags: boolean = false) {
  if (!appendTags) {
    // Delete existing MakerWorld tags for this design (replace mode)
    db.prepare(`
      UPDATE design_tag SET deleted_at = datetime('now')
      WHERE design_id = ? AND platform_id = ? AND deleted_at IS NULL
    `).run(designId, PLATFORM_IDS.MAKERWORLD);
  }

  // Track tags to avoid duplicates (both from DB and within the incoming array)
  const seenTags = new Set<string>();

  // Get ALL existing tags (any platform) to avoid duplicates
  // This prevents duplicates when merging MakerWorld tags into a design that already has tags from PubMan or other platforms
  const existing = db.prepare(`
    SELECT tag FROM design_tag
    WHERE design_id = ? AND deleted_at IS NULL
  `).all(designId) as Array<{ tag: string }>;
  existing.forEach((t) => seenTags.add(t.tag.toLowerCase()));

  // Insert new tags
  const insertTag = db.prepare(`
    INSERT INTO design_tag (design_id, tag, platform_id, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `);

  for (const tag of tags) {
    if (tag && tag.trim()) {
      const normalizedTag = tag.trim();
      const lowerTag = normalizedTag.toLowerCase();
      // Skip if already seen (deduplicates both DB tags and incoming duplicates)
      if (seenTags.has(lowerTag)) {
        continue;
      }
      seenTags.add(lowerTag);
      insertTag.run(designId, normalizedTag, PLATFORM_IDS.MAKERWORLD);
    }
  }
}

/**
 * Create an asset record for a downloaded file
 */
function createAssetRecord(
  db: ReturnType<typeof getDatabase>,
  designId: number,
  designerId: number,
  asset: AssetData
) {
  // Normalize file path to relative path within assets directory
  let filePath = path.normalize(asset.filePath);
  const assetsPrefix = path.join(path.sep, "assets", path.sep);
  const idx = filePath.indexOf(assetsPrefix);
  if (idx !== -1) {
    filePath = filePath.slice(idx);
  }

  // Check if asset already exists (by file path)
  const existing = db.prepare(`
    SELECT id FROM design_asset
    WHERE design_id = ? AND file_path = ? AND deleted_at IS NULL
  `).get(designId, filePath);

  if (!existing) {
    db.prepare(`
      INSERT INTO design_asset (design_id, designer_id, file_name, file_ext, file_path, original_file_size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(designId, designerId, asset.fileName, asset.fileExt, filePath, asset.fileSize || null);
  } else {
    // Update file size if it was missing
    if (asset.fileSize) {
      db.prepare(`
        UPDATE design_asset SET original_file_size = ? WHERE design_id = ? AND file_path = ? AND deleted_at IS NULL
      `).run(asset.fileSize, designId, filePath);
    }
  }
}

/**
 * GET /api/makerworld/sync
 * Get sync status for MakerWorld designs
 * Returns list of MakerWorld design IDs that are already synced
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const username = request.headers.get("x-username") || "default";

    const designer = db.prepare(`
      SELECT id FROM designer
      WHERE username = ? AND deleted_at IS NULL AND status = 'active'
    `).get(username) as { id: number } | undefined;

    if (!designer) {
      return NextResponse.json({ error: "Designer not found" }, { status: 404 });
    }

    // Get all MakerWorld platform links for this designer's designs
    const syncedDesigns = db.prepare(`
      SELECT dp.platform_design_id, dp.design_id, d.main_name, dp.updated_at
      FROM design_platform dp
      JOIN design d ON d.id = dp.design_id AND d.deleted_at IS NULL
      WHERE dp.platform_id = ?
        AND dp.deleted_at IS NULL
        AND d.designer_id = ?
    `).all(PLATFORM_IDS.MAKERWORLD, designer.id) as Array<{
      platform_design_id: string;
      design_id: number;
      main_name: string;
      updated_at: string;
    }>;

    // Get all designs with full details (for name-based matching and merge preview)
    const allDesigns = db.prepare(`
      SELECT id, main_name, description, license_key, makerworld_category
      FROM design
      WHERE designer_id = ? AND deleted_at IS NULL
    `).all(designer.id) as Array<{
      id: number;
      main_name: string;
      description: string | null;
      license_key: string | null;
      makerworld_category: string | null;
    }>;

    // Get tags for each design
    const designTags = db.prepare(`
      SELECT design_id, tag FROM design_tag
      WHERE design_id IN (SELECT id FROM design WHERE designer_id = ? AND deleted_at IS NULL)
        AND deleted_at IS NULL
    `).all(designer.id) as Array<{ design_id: number; tag: string }>;

    // Group tags by design
    const tagsByDesign = new Map<number, string[]>();
    for (const dt of designTags) {
      if (!tagsByDesign.has(dt.design_id)) {
        tagsByDesign.set(dt.design_id, []);
      }
      tagsByDesign.get(dt.design_id)!.push(dt.tag);
    }

    // Build design details map (keyed by name for merge preview)
    const designDetails: Record<string, {
      id: number;
      name: string;
      description: string;
      license: string;
      category: string;
      tags: string[];
    }> = {};

    for (const d of allDesigns) {
      designDetails[d.main_name] = {
        id: d.id,
        name: d.main_name,
        description: d.description || '',
        license: d.license_key || '',
        category: d.makerworld_category || '',
        tags: tagsByDesign.get(d.id) || [],
      };
    }

    return NextResponse.json({
      allDesignNames: allDesigns.map(d => d.main_name),
      syncedDesigns: syncedDesigns.map(d => ({
        platformDesignId: d.platform_design_id,
        designId: d.design_id.toString(),
        name: d.main_name,
        lastSynced: d.updated_at,
      })),
      designDetails,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("[Sync] Failed to get sync status:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
