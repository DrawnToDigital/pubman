import { NextResponse } from 'next/server';
import path from 'path';
import { getDatabase } from "../../../../../../lib/betterSqlite3";
import { generatePrintProfileForAsset, formatPrintProfileRow, setMakerWorldProfileId } from "../../../../../../lib/printProfile";
import log from "electron-log/node";

// POST /api/design/[designID]/asset/[assetID]/print-profile
// (Re)generates the print profile for a 3MF asset by reading its slicer settings.
// Used both to backfill assets added before this feature existed and to retry
// extraction on demand.
export async function POST(request, context) {
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
    WHERE id = ? AND deleted_at IS NULL
  `).get(designID);
  if (!design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  const asset = db.prepare(`
    SELECT id, file_ext, file_path FROM design_asset
    WHERE id = ? AND design_id = ? AND deleted_at IS NULL
  `).get(assetID, designID);
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  if (asset.file_ext.toLowerCase() !== '3mf') {
    return NextResponse.json({ error: 'Print profiles can only be generated for .3mf assets' }, { status: 400 });
  }

  const appDataPath = process.env.NEXT_PUBLIC_APP_DATA_PATH || path.resolve('appdata');
  const absoluteFilePath = path.join(appDataPath, asset.file_path);

  try {
    const profile = generatePrintProfileForAsset(db, asset.id, absoluteFilePath, { force: true });
    return NextResponse.json({
      print_profile: profile,
      message: profile ? 'Print profile generated successfully' : 'No slicer print settings were found in this file',
    }, { status: 200 });
  } catch (error) {
    log.error('Failed to generate print profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/design/[designID]/asset/[assetID]/print-profile
// Returns the currently stored print profile, if any, without re-parsing the file.
export async function GET(request, context) {
  const { designID, assetID } = await context.params; // Await params
  const db = getDatabase();

  const asset = db.prepare(`
    SELECT id FROM design_asset
    WHERE id = ? AND design_id = ? AND deleted_at IS NULL
  `).get(assetID, designID);
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const row = db.prepare('SELECT * FROM print_profile WHERE design_asset_id = ?').get(asset.id);
  return NextResponse.json({ print_profile: formatPrintProfileRow(row) }, { status: 200 });
}

// PATCH /api/design/[designID]/asset/[assetID]/print-profile
// Records the MakerWorld draft/profile id this 3MF was uploaded as, so a later publish
// updates that same MakerWorld instance instead of creating a duplicate.
export async function PATCH(request, context) {
  const { designID, assetID } = await context.params; // Await params
  const db = getDatabase();

  const asset = db.prepare(`
    SELECT id FROM design_asset
    WHERE id = ? AND design_id = ? AND deleted_at IS NULL
  `).get(assetID, designID);
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const body = await request.json();
  const { makerworld_profile_id: makerworldProfileId } = body;
  if (!makerworldProfileId) {
    return NextResponse.json({ error: 'makerworld_profile_id is required' }, { status: 400 });
  }

  try {
    setMakerWorldProfileId(db, asset.id, makerworldProfileId);
    return NextResponse.json({ message: 'MakerWorld profile id recorded' }, { status: 200 });
  } catch (error) {
    log.error('Failed to record MakerWorld profile id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
