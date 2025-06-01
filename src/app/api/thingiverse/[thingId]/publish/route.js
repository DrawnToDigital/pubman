import { NextResponse } from 'next/server';
import { ThingiverseAPI } from '../../thingiverse-lib';
import {getDatabase} from "../../../../lib/betterSqlite3";
import log from "electron-log/renderer";

export async function POST(request, { params }) {
  try {
    const { thingId } = await params;
    const accessToken = request.headers.get('x-thingiverse-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Thingiverse access token' }, { status: 401 });
    }

    // Call Thingiverse API to publish the thing
    const api = new ThingiverseAPI(accessToken);

    const thingData = await api.getThingById(thingId);
    let publishResult;
    if (thingData?.is_published === 0) {
      publishResult = await api.publishThing(thingId);
    } else if (thingData?.is_published === 1) {
      publishResult = {"message": "Thing is already published"};
    } else {
      publishResult = {"error": "Thing is not in a publishable state"};
      log.error(`Thing ${thingId} is not in a publishable state:`, thingData);
      return NextResponse.json(publishResult, { status: 400 });
    }

    // Update our database to reflect the published status
    const db = getDatabase();

    // Thingiverse platform ID is 3 according to the schema
    const THINGIVERSE_PLATFORM_ID = 3;
    // Published status code is 2 (1 was draft)
    const PUBLISHED_STATUS = 2;

    // Find the design_platform record for this Thingiverse thing
    const designPlatform = db.prepare(`
      SELECT id FROM design_platform 
      WHERE platform_id = ? AND platform_design_id = ? AND deleted_at IS NULL 
    `).get(THINGIVERSE_PLATFORM_ID, thingId);

    if (!designPlatform) {
      return NextResponse.json({
        error: 'Design not found in database',
        thingiverseResult: publishResult
      }, { status: 404 });
    }

    // Update the publish status and timestamp
    const updateResult = db.prepare(`
      UPDATE design_platform
      SET published_status = ?, 
          published_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(PUBLISHED_STATUS, designPlatform.id);

    // Get the updated record
    const updatedRecord = db.prepare(`
      SELECT
        design_id,
        published_status,
        strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at,
        strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at,
        strftime('%Y-%m-%dT%H:%M:%fZ', published_at) as published_at
      FROM design_platform
      WHERE id = ?
    `).get(designPlatform.id);

    return NextResponse.json({
      message: 'Thing published successfully',
      thingiverseResult: publishResult,
      databaseUpdate: {
        success: updateResult.changes > 0,
        record: updatedRecord
      }
    }, { status: 200 });
  } catch (error) {
    log.error('Failed to publish Thingiverse thing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}