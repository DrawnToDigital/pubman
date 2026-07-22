import AdmZip from 'adm-zip';
import log from 'electron-log/node';

const PROJECT_SETTINGS_ENTRY = 'Metadata/project_settings.config';
const MODEL_SETTINGS_ENTRY = 'Metadata/model_settings.config';
const PLATE_JSON_RE = /^Metadata\/plate_\d+\.json$/;
const PLATE_TAG_RE = /<plate(?:\s|>)/g;

function firstOf(value) {
  if (Array.isArray(value)) return value.length > 0 ? value[0] : null;
  return value === undefined ? null : value;
}

function toNumber(value) {
  if (value === undefined || value === null) return null;
  const n = parseFloat(String(value).replace('%', ''));
  return Number.isFinite(n) ? n : null;
}

function toStringArray(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
}

function countPlates(zip) {
  const plateJsonCount = zip.getEntries().filter((e) => PLATE_JSON_RE.test(e.entryName)).length;
  if (plateJsonCount > 0) return plateJsonCount;

  const modelSettings = zip.getEntry(MODEL_SETTINGS_ENTRY);
  if (!modelSettings) return null;
  const matches = modelSettings.getData().toString('utf-8').match(PLATE_TAG_RE);
  return matches ? matches.length : null;
}

/**
 * Extract Bambu Studio / OrcaSlicer print settings from a .3mf project file.
 * Accepts either an absolute file path or an in-memory Buffer (both supported by adm-zip).
 * Returns null for 3MF files that aren't a recognized slicer project (e.g. plain mesh exports).
 */
export function parseThreeMfPrintProfile(pathOrBuffer) {
  let zip;
  try {
    zip = new AdmZip(pathOrBuffer);
  } catch (error) {
    log.warn('[PrintProfile] Could not open file as a zip/3mf archive:', error);
    return null;
  }

  const settingsEntry = zip.getEntry(PROJECT_SETTINGS_ENTRY);
  if (!settingsEntry) {
    // Not a Bambu Studio / OrcaSlicer project 3MF - nothing to extract
    return null;
  }

  let settings;
  try {
    settings = JSON.parse(settingsEntry.getData().toString('utf-8'));
  } catch (error) {
    log.warn('[PrintProfile] Failed to parse project_settings.config as JSON:', error);
    return null;
  }

  return {
    printer_model: settings.printer_model || null,
    printer_settings_name: settings.printer_settings_id || null,
    nozzle_diameter: toNumber(firstOf(settings.nozzle_diameter)),
    bed_type: settings.curr_bed_type || null,
    layer_height: toNumber(settings.layer_height),
    first_layer_height: toNumber(settings.initial_layer_print_height),
    wall_loops: toNumber(settings.wall_loops),
    infill_density: toNumber(settings.sparse_infill_density),
    infill_pattern: settings.sparse_infill_pattern || null,
    supports_enabled: settings.enable_support === '1' || settings.enable_support === 1,
    support_type: settings.support_type || null,
    print_settings_name: settings.print_settings_id || null,
    filament_types: toStringArray(settings.filament_type),
    filament_colors: toStringArray(settings.filament_colour),
    filament_names: toStringArray(settings.filament_settings_id),
    plate_count: countPlates(zip),
  };
}

function upsertPrintProfile(db, assetId, profile) {
  db.prepare(`
    INSERT INTO print_profile (
      design_asset_id, printer_model, printer_settings_name, nozzle_diameter, bed_type,
      layer_height, first_layer_height, wall_loops, infill_density, infill_pattern,
      supports_enabled, support_type, print_settings_name, filament_types, filament_colors,
      filament_names, plate_count, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(design_asset_id) DO UPDATE SET
      printer_model = excluded.printer_model,
      printer_settings_name = excluded.printer_settings_name,
      nozzle_diameter = excluded.nozzle_diameter,
      bed_type = excluded.bed_type,
      layer_height = excluded.layer_height,
      first_layer_height = excluded.first_layer_height,
      wall_loops = excluded.wall_loops,
      infill_density = excluded.infill_density,
      infill_pattern = excluded.infill_pattern,
      supports_enabled = excluded.supports_enabled,
      support_type = excluded.support_type,
      print_settings_name = excluded.print_settings_name,
      filament_types = excluded.filament_types,
      filament_colors = excluded.filament_colors,
      filament_names = excluded.filament_names,
      plate_count = excluded.plate_count,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    assetId,
    profile.printer_model,
    profile.printer_settings_name,
    profile.nozzle_diameter,
    profile.bed_type,
    profile.layer_height,
    profile.first_layer_height,
    profile.wall_loops,
    profile.infill_density,
    profile.infill_pattern,
    profile.supports_enabled ? 1 : 0,
    profile.support_type,
    profile.print_settings_name,
    JSON.stringify(profile.filament_types),
    JSON.stringify(profile.filament_colors),
    JSON.stringify(profile.filament_names),
    profile.plate_count
  );
}

/**
 * Parse a design_asset's 3MF file (by absolute path) and store the result as its print profile.
 * No-op if a profile already exists for this asset, unless options.force is set.
 * Never throws - extraction is best-effort and safe to call inline from asset creation flows.
 */
export function generatePrintProfileForAsset(db, assetId, absoluteFilePath, options = {}) {
  const { force = false } = options;

  if (!force) {
    const existing = db.prepare('SELECT id FROM print_profile WHERE design_asset_id = ?').get(assetId);
    if (existing) return null;
  }

  let profile;
  try {
    profile = parseThreeMfPrintProfile(absoluteFilePath);
  } catch (error) {
    log.warn(`[PrintProfile] Failed to extract print profile for asset ${assetId}:`, error);
    return null;
  }
  if (!profile) return null;

  upsertPrintProfile(db, assetId, profile);
  return profile;
}

function safeJsonArray(text) {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Convert a print_profile DB row into the shape returned to the frontend. */
export function formatPrintProfileRow(row) {
  if (!row) return null;
  return {
    printer_model: row.printer_model,
    printer_settings_name: row.printer_settings_name,
    nozzle_diameter: row.nozzle_diameter,
    bed_type: row.bed_type,
    layer_height: row.layer_height,
    first_layer_height: row.first_layer_height,
    wall_loops: row.wall_loops,
    infill_density: row.infill_density,
    infill_pattern: row.infill_pattern,
    supports_enabled: Boolean(row.supports_enabled),
    support_type: row.support_type,
    print_settings_name: row.print_settings_name,
    filament_types: safeJsonArray(row.filament_types),
    filament_colors: safeJsonArray(row.filament_colors),
    filament_names: safeJsonArray(row.filament_names),
    plate_count: row.plate_count,
    makerworld_profile_id: row.makerworld_profile_id || null,
  };
}

/**
 * Record the MakerWorld draft/profile id a 3MF's print profile was uploaded as, so a later
 * publish updates that same MakerWorld instance instead of creating a duplicate. Upserts rather
 * than plain-updates because a MakerWorld profile can be created for an asset that was synced in
 * before local print-profile extraction existed (or whose 3mf has no recognized slicer
 * settings), in which case there's no print_profile row yet to update.
 */
export function setMakerWorldProfileId(db, assetId, makerworldProfileId) {
  db.prepare(`
    INSERT INTO print_profile (design_asset_id, makerworld_profile_id, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(design_asset_id) DO UPDATE SET
      makerworld_profile_id = excluded.makerworld_profile_id,
      updated_at = CURRENT_TIMESTAMP
  `).run(assetId, String(makerworldProfileId));
}

/** Bulk-fetch print profiles for a set of design_asset ids, keyed by asset id. */
export function getPrintProfilesByAssetIds(db, assetIds) {
  if (!assetIds || assetIds.length === 0) return {};
  const placeholders = assetIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM print_profile WHERE design_asset_id IN (${placeholders})`).all(...assetIds);
  const result = {};
  for (const row of rows) {
    result[row.design_asset_id] = formatPrintProfileRow(row);
  }
  return result;
}
