import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getDatabase } from '../../../../../../../lib/betterSqlite3';
import { formatPrintProfileRow, setMakerWorldProfileId } from '../../../../../../../lib/printProfile';
import {
  getMakerWorldS3Config,
  uploadFileToMakerWorldS3,
  createMakerWorldDraft,
  updateMakerWorldDraft,
  submitMakerWorldDraft,
} from '../../../../../../../lib/makerworldServer';
import { AddPrintProfileRequestSchema, makerWorldPrinterDevModels, MakerWorldAPI } from '../../../../../../makerworld/makerworld-lib';
import log from 'electron-log/node';

const MAKERWORLD_PLATFORM_ID = 5;
const PUBLISHED_STATUS_PUBLISHED = 2;

// POST /api/design/[designID]/asset/[assetID]/print-profile/makerworld
// Creates (or updates) a MakerWorld print profile for a .3mf asset, end to end, entirely
// server-side: reads the file and the chosen photo off disk, uploads both to MakerWorld's S3,
// then creates and submits the profile draft. Runs over plain HTTP with no dependency on the
// Electron renderer/preload context, so it works whether PubMan is driven from the packaged
// app window or any other HTTP client pointed at the same server.
export async function POST(request, context) {
  const { designID, assetID } = await context.params;
  const db = getDatabase();

  const body = await request.json();
  const { title, photo_asset_id: photoAssetId } = body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (!photoAssetId) {
    return NextResponse.json({ error: 'photo_asset_id is required' }, { status: 400 });
  }

  const asset = db.prepare(`
    SELECT id, file_name, file_ext, file_path FROM design_asset
    WHERE id = ? AND design_id = ? AND deleted_at IS NULL
  `).get(assetID, designID);
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }
  if (asset.file_ext.toLowerCase() !== '3mf') {
    return NextResponse.json({ error: 'Only .3mf assets can become a MakerWorld print profile' }, { status: 400 });
  }

  const photo = db.prepare(`
    SELECT id, file_name, file_ext, file_path FROM design_asset
    WHERE id = ? AND design_id = ? AND deleted_at IS NULL
  `).get(photoAssetId, designID);
  if (!photo) {
    return NextResponse.json({ error: 'Photo asset not found' }, { status: 404 });
  }

  const mwPlatform = db.prepare(`
    SELECT platform_design_id, published_status FROM design_platform
    WHERE design_id = ? AND platform_id = ? AND deleted_at IS NULL
  `).get(designID, MAKERWORLD_PLATFORM_ID);
  if (!mwPlatform?.platform_design_id || mwPlatform.published_status !== PUBLISHED_STATUS_PUBLISHED) {
    return NextResponse.json({ error: 'Design must be published to MakerWorld before adding a print profile' }, { status: 400 });
  }

  const profileRow = db.prepare('SELECT * FROM print_profile WHERE design_asset_id = ?').get(asset.id);
  const profile = formatPrintProfileRow(profileRow);

  const appDataPath = process.env.NEXT_PUBLIC_APP_DATA_PATH || path.resolve('appdata');

  // api.bambulab.com's user-info endpoint isn't behind the same Cloudflare protection as
  // makerworld.com's draft endpoints, so the older plain-token MakerWorldAPI client (also used
  // by /api/makerworld/user) works fine for this one call - no need for the session-cookie path.
  const tokenRow = db.prepare(`
    SELECT token FROM auth_tokens WHERE provider = 'makerworld' ORDER BY updated_at DESC, created_at DESC
  `).get();
  if (!tokenRow?.token) {
    return NextResponse.json({ error: 'Not authenticated to MakerWorld' }, { status: 401 });
  }

  try {
    const legacyApi = new MakerWorldAPI(tokenRow.token);
    const [userInfo, s3Config] = await Promise.all([legacyApi.getUserInfo(), getMakerWorldS3Config()]);

    const [modelBuffer, photoBuffer] = await Promise.all([
      fs.readFile(path.join(appDataPath, asset.file_path)),
      fs.readFile(path.join(appDataPath, photo.file_path)),
    ]);

    const [modelUpload, photoUpload] = await Promise.all([
      uploadFileToMakerWorldS3(asset.file_name, modelBuffer, userInfo.uid, s3Config),
      uploadFileToMakerWorldS3(photo.file_name, photoBuffer, userInfo.uid, s3Config),
    ]);

    const printerModel = profile?.printer_model || '';
    const knownPrinter = makerWorldPrinterDevModels[printerModel];
    const existingProfileId = profile?.makerworld_profile_id ? Number(profile.makerworld_profile_id) : 0;

    const payload = AddPrintProfileRequestSchema.parse({
      parentId: Number(mwPlatform.platform_design_id),
      profileId: existingProfileId,
      title: title.trim(),
      profileTitle: title.trim(),
      profileCover: photoUpload.url,
      auxiliaryPictures: [{ name: photo.file_name, url: photoUpload.url }],
      model3Mf: { name: asset.file_name, url: modelUpload.url, size: modelBuffer.length },
      printer: {
        model: printerModel,
        variant: profile?.nozzle_diameter || 0,
        settingsId: profile?.printer_settings_name || '',
      },
      compatibility: knownPrinter
        ? { ...knownPrinter, nozzleDiameter: profile?.nozzle_diameter || 0 }
        : undefined,
      projectSettings: {
        layerHeight: profile?.layer_height != null ? String(profile.layer_height) : '',
        wallLoops: profile?.wall_loops != null ? String(profile.wall_loops) : '',
        sparseInfillDensity: profile?.infill_density != null ? `${profile.infill_density}%` : '',
      },
    });

    let newProfileId = existingProfileId;
    if (existingProfileId) {
      log.info(`[MakerWorld] (server) Updating print profile ${existingProfileId} for asset ${asset.id}`);
      await updateMakerWorldDraft(existingProfileId, payload);
    } else {
      log.info(`[MakerWorld] (server) Creating print profile "${title}" for asset ${asset.id}`);
      const createResult = await createMakerWorldDraft(payload);
      newProfileId = createResult?.id;
      if (!newProfileId) {
        log.error('[MakerWorld] (server) Create draft response had no id:', createResult);
        return NextResponse.json({ error: "MakerWorld didn't return a profile id" }, { status: 502 });
      }
    }

    log.info(`[MakerWorld] (server) Submitting print profile draft ${newProfileId}`);
    await submitMakerWorldDraft(newProfileId);

    setMakerWorldProfileId(db, asset.id, newProfileId);

    return NextResponse.json({ makerworld_profile_id: String(newProfileId) }, { status: 200 });
  } catch (error) {
    log.error(`[MakerWorld] (server) Failed to create print profile for asset ${asset.id}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to create MakerWorld print profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
