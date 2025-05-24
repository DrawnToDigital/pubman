import { NextResponse } from 'next/server';
import { PrintablesAPI } from '../printables-lib';
import log from "electron-log/renderer";
import path from "path";
import fs from "fs";
import {getDatabase} from "../../../lib/betterSqlite3";

const PRINTABLES_PLATFORM_ID = 4;
const PUBLISHED_STATUS_DRAFT = 1;
const PUBLISHED_STATUS_PUBLISHED = 2;

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export async function POST(request) {
  try {
    const accessToken = request.headers.get('x-printables-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Printables access token' }, { status: 401 });
    }
    const {designId, designData, printablesId} = await request.json();

    if (!accessToken || !designId || !designData) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const api = new PrintablesAPI(accessToken);
    const db = getDatabase();

    const fileResults = [];
    const fileIds = [];
    let hasFileErrors = false;

    // File processing logic
    if (designData.assets && designData.assets.length > 0) {
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
          const uploadResult = await api.uploadFile(asset.file_name, fileBuffer);
          log.info(`Uploaded file: ${asset.file_name}`, uploadResult);
          fileResults.push({
            action: 'upload',
            name: asset.file_name,
            result: uploadResult
          });
          if (uploadResult?.id) {
            fileIds.push(uploadResult.id)
          }
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

    const gcodes = [];
    const stls = [];
    const slas = [];
    const otherFiles = [];
    const images = [];
    // Poll for file upload completion
    for (let i = 0; i < 3; i++) {
      if (fileIds.length === 0) break;
      const pollResponse = await api.pollFileUploads(fileIds);
      if (pollResponse && pollResponse.length > 0) {
        for (const file of pollResponse) {
          if (file.isProcessed) {
            gcodes.push(...file.gcodes);
            stls.push(...file.stls);
            slas.push(...file.slas);
            otherFiles.push(...file.otherFiles);
            images.push(...file.images);
            const index = fileIds.indexOf(file.id);
            if (index > -1) {
              fileIds.splice(index, 1);
            }
          }
        }
        if (fileIds.length === 0) break;
        await sleep(1000 * Math.pow(2, i));
      }
    }

    // Transform design data to Printables format
    const modelData = {
      id: printablesId || null,
      name: designData.main_name,
      description: designData.description,
      summary: designData.summary,
      tags: designData.tags ? designData.tags.map(tag => tag.tag) : [],
      category: designData.printables_category,
      license: designData.license_key,
      draft: null,
      gcodes: null,
      stls: null,
      slas: null,
      otherFiles: null,
      images: null,
    };
    if (designData.draft === false) {
      modelData.draft = false;
    } else if (designData.draft === true) {
      modelData.draft = true;
    }
    if (gcodes.length > 0) {
      modelData.gcodes = gcodes.map(f => ({
        id: f.id,
        name: f.name,
        folder: f.folder,
        note: f.note,
      }));
    }
    if (stls.length > 0) {
      modelData.stls = stls.map(f => ({
        id: f.id,
        name: f.name,
        folder: f.folder,
        note: f.note,
      }));
    }
    if (slas.length > 0) {
      modelData.slas = slas.map(f => ({
        id: f.id,
        name: f.name,
        folder: f.folder,
        note: f.note,
      }));
    }
    if (otherFiles.length > 0) {
      modelData.otherFiles = otherFiles.map(f => ({
        id: f.id,
        name: f.name,
        folder: f.folder,
        note: f.note,
      }));
    }
    if (images.length > 0) {
      modelData.images = images.map(image => ({
        id: image.id,
      }));
    }

    let designResponse;
    // Create a new design or update existing one
    if (printablesId) {
      designResponse = await api.updateModel(modelData);
      if (!designResponse || !designResponse.id) {
        return NextResponse.json({ error: 'Failed to update Printables model' }, { status: 500 });
      }
    } else {
      // Create a new design
      designResponse = await api.createModel(modelData);
      if (!designResponse || !designResponse.id) {
        return NextResponse.json({ error: 'Failed to create Printables model' }, { status: 500 });
      }

      // Record the creation in design_platform table
      db.prepare(`
        INSERT INTO design_platform (platform_id, design_id, platform_design_id, published_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(PRINTABLES_PLATFORM_ID, designId, designResponse.id.toString(), PUBLISHED_STATUS_DRAFT);
    }

    // Update the design_platform record with the new status
    if (designResponse.datePublished !== null) {
      db.prepare(`
      UPDATE design_platform
      SET published_status = ?, 
          platform_design_id = ?,
          updated_at = datetime('now'),
          published_at = datetime('now')
      WHERE platform_id = ? AND design_id = ?
    `).run(PUBLISHED_STATUS_PUBLISHED, designResponse.id.toString(), PRINTABLES_PLATFORM_ID, designId);
    } else {
      db.prepare(`
      UPDATE design_platform
      SET published_status = ?, 
          platform_design_id = ?,
          updated_at = datetime('now'),
          published_at = NULL
      WHERE platform_id = ? AND design_id = ?
    `).run(PUBLISHED_STATUS_DRAFT, designResponse.id.toString(), PRINTABLES_PLATFORM_ID, designId);
    }


    // Get the updated record from the database
    const designPlatform = db.prepare(`
      SELECT
        platform_design_id,
        published_status,
        strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at,
        strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at,
        strftime('%Y-%m-%dT%H:%M:%fZ', published_at) as published_at
      FROM design_platform
      WHERE platform_id = ? AND design_id = ?
    `).get(PRINTABLES_PLATFORM_ID, designId);

    return NextResponse.json({
      message: designId ? `Design updated ${hasFileErrors ? 'with errors ': ''}on Printables` : `Design published ${hasFileErrors ? 'with errors ': ''}to Printables as draft`,
      designId: designResponse.id,
      printablesUrl: `https://www.printables.com/model/${designResponse.id}`,
      hasFileErrors: hasFileErrors,
      fileResults: fileResults,
      designPlatform: designPlatform
    }, { status: designId ? 200 : 201 });
  } catch (error) {
    log.error('Failed to create Printables model:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
