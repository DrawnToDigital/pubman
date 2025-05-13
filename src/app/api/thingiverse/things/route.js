import {NextResponse} from "next/server";
import {ThingiverseAPI} from "../thingiverse-lib";
import {getDatabase} from "../../../lib/betterSqlite3";
import fs from "fs";
import path from "path";
import log from "electron-log/renderer";

// Thingiverse platform ID is 3 according to the schema
const THINGIVERSE_PLATFORM_ID = 3;
// Use 1 for draft status
const PUBLISHED_STATUS_DRAFT = 1;

export async function GET(request) {
  try {
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    const username = request.nextUrl.searchParams.get('name');
    if (!username) {
      return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
    }

    const api = new ThingiverseAPI(accessToken);
    const things = await api.getThingsByUsername(username);
    return NextResponse.json(things, { status: 200 });
  } catch (error) {
    log.error('Failed to get Thingiverse things:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    const { designId, designData, thingId } = await request.json();
    if (!designId || !designData) {
      return NextResponse.json({ error: 'Missing designId or designData' }, { status: 400 });
    }

    const api = new ThingiverseAPI(accessToken);
    const db = getDatabase();

    // Transform design data to Thingiverse format
    const thingData = {
      name: designData.main_name,
      description: designData.description,
      instructions: designData.instructions || '',
      license: designData.license_key,
      category: designData.categories && designData.categories.length > 0
        ? designData.categories[0].category
        : 'Other',
      tags: designData.tags ? designData.tags.map(tag => tag.tag) : [],
    };

    let thingResponse;

    // Create a new thing or update existing one
    if (thingId) {
      thingResponse = await api.updateThing(thingId, thingData);
      if (!thingResponse || !thingResponse.id) {
        return NextResponse.json({ error: 'Failed to update Thingiverse thing' }, { status: 500 });
      }
    } else {
      // Create a new thing
      thingResponse = await api.createThing(thingData);
        if (!thingResponse || !thingResponse.id) {
        return NextResponse.json({ error: 'Failed to create Thingiverse thing' }, { status: 500 });
      }

      // Record the creation in design_platform table
      db.prepare(`
        INSERT INTO design_platform (platform_id, design_id, platform_design_id, published_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(THINGIVERSE_PLATFORM_ID, designId, thingResponse.id.toString(), PUBLISHED_STATUS_DRAFT);
    }

    const fileResults = [];
    let hasFileErrors = false;

    // File processing logic
    if (designData.assets && designData.assets.length > 0) {
      const existingImages = thingId
        ? await api.getImagesForThing(thingId)
        : [];
      for (const image of existingImages) {
        try {
          const deleteResult = await api.deleteImage(thingResponse.id, image.id);
          log.info(`Deleted image: ${image.id} ${image.name}`, deleteResult);
          fileResults.push({
            action: 'delete',
            name: image.name,
            result: deleteResult
          });
        } catch (error) {
          log.error(`Failed to delete image ${image.id} ${image.name}:`, error);
          hasFileErrors = true;
          fileResults.push({
            action: 'delete',
            name: image.name,
            error: error.message,
          });
        }
      }

      const existingFiles = thingId
        ? await api.getFilesForThing(thingId)
        : [];
      for (const file of existingFiles) {
        try {
          const deleteResult = await api.deleteFile(thingResponse.id, file.id);
          log.info(`Deleted file: ${file.id} ${file.name}`, deleteResult);
          fileResults.push({
            action: 'delete',
            name: file.name,
            result: deleteResult
          });
        } catch (error) {
          log.error(`Failed to delete file ${file.id} ${file.name}:`, error);
          hasFileErrors = true;
          fileResults.push({
            action: 'delete',
            name: file.name,
            error: error.message,
          });
        }
      }

      // Upload new assets
      for (const asset of designData.assets) {
        try {
          // Extract file path from URL
          let filePath = asset.url.replace('local://', '');
          // Handle paths appropriately based on context
          if (filePath.startsWith('/assets/')) {
            const appDataPath = process.env.NEXT_PUBLIC_APP_DATA_PATH || path.join(process.cwd(), 'appdata');
            filePath = path.join(appDataPath, filePath);
          }
          const fileBuffer = fs.readFileSync(filePath);
          const uploadResult = await api.uploadFile(thingResponse.id, asset.file_name, fileBuffer);
          log.info(`Uploaded file: ${asset.file_name}`, uploadResult);
          fileResults.push({
            action: 'upload',
            name: asset.file_name,
            result: uploadResult
          });
        } catch (error) {
          log.error(`Failed to upload file ${asset.file_name}:`, error);
          hasFileErrors = true;
          fileResults.push({
            action: 'upload',
            name: asset.file_name,
            error: error.message,
          });
        }
      }
    }

    // Update the design_platform record with the new status
    db.prepare(`
      UPDATE design_platform
      SET published_status = ?, 
          platform_design_id = ?,
          updated_at = datetime('now')
      WHERE platform_id = ? AND design_id = ?
    `).run(PUBLISHED_STATUS_DRAFT, thingResponse.id.toString(), THINGIVERSE_PLATFORM_ID, designId);

    // Get the updated record from the database
    const designPlatform = db.prepare(`
      SELECT
        platform_design_id,
        published_status,
        strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at,
        strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at,
        strftime('%Y-%m-%dT%H:%M:%fZ', published_at) as published_at
      FROM design_platform
      WHERE platform_id = 3 AND design_id = ?
    `).get(designId);

    return NextResponse.json({
      message: thingId ? `Design updated ${hasFileErrors ? 'with errors ': ''}on Thingiverse` : `Design published ${hasFileErrors ? 'with errors ': ''}to Thingiverse as draft`,
      thingiverseId: thingResponse.id,
      thingiverseUrl: `https://www.thingiverse.com/thing:${thingResponse.id}`,
      hasFileErrors: hasFileErrors,
      fileResults: fileResults,
      designPlatform: designPlatform
    }, { status: thingId ? 200 : 201 });
  } catch (error) {
    log.error('Failed to create Thingiverse thing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}