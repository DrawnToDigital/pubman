import AdmZip from 'adm-zip';
import {
  parseThreeMfPrintProfile,
  generatePrintProfileForAsset,
  formatPrintProfileRow,
  getPrintProfilesByAssetIds,
  setMakerWorldProfileId,
} from './printProfile';

function buildSampleThreeMf({ plateCount = 2 } = {}) {
  const zip = new AdmZip();
  const settings = {
    printer_model: 'Bambu Lab X1 Carbon',
    printer_settings_id: 'Bambu Lab X1 Carbon 0.4 nozzle',
    nozzle_diameter: ['0.4'],
    curr_bed_type: 'Textured PEI Plate',
    layer_height: '0.2',
    initial_layer_print_height: '0.2',
    wall_loops: '3',
    sparse_infill_density: '15%',
    sparse_infill_pattern: 'grid',
    enable_support: '1',
    support_type: 'tree(auto)',
    print_settings_id: '0.20mm Standard @BBL X1C',
    filament_type: ['PLA', 'PETG'],
    filament_colour: ['#FF0000', '#00FF00'],
    filament_settings_id: ['Bambu PLA Basic @BBL X1C', 'Bambu PETG Basic @BBL X1C'],
  };
  zip.addFile('Metadata/project_settings.config', Buffer.from(JSON.stringify(settings)));
  for (let i = 1; i <= plateCount; i++) {
    zip.addFile(`Metadata/plate_${i}.json`, Buffer.from('{}'));
  }
  return zip.toBuffer();
}

function buildMeshOnlyThreeMf() {
  const zip = new AdmZip();
  zip.addFile('3D/3dmodel.model', Buffer.from('<xml/>'));
  return zip.toBuffer();
}

function buildThreeMfWithModelSettingsPlates(plateTagCount) {
  const zip = new AdmZip();
  zip.addFile('Metadata/project_settings.config', Buffer.from(JSON.stringify({ printer_model: 'Bambu Lab P1S' })));
  const plates = Array.from({ length: plateTagCount }, (_, i) => `<plate><metadata key="index" value="${i + 1}"/></plate>`).join('');
  zip.addFile('Metadata/model_settings.config', Buffer.from(`<config>${plates}</config>`));
  return zip.toBuffer();
}

describe('parseThreeMfPrintProfile', () => {
  it('extracts printer/filament/plate fields from a Bambu-style project 3mf', () => {
    const profile = parseThreeMfPrintProfile(buildSampleThreeMf({ plateCount: 3 }));

    expect(profile).toEqual({
      printer_model: 'Bambu Lab X1 Carbon',
      printer_settings_name: 'Bambu Lab X1 Carbon 0.4 nozzle',
      nozzle_diameter: 0.4,
      bed_type: 'Textured PEI Plate',
      layer_height: 0.2,
      first_layer_height: 0.2,
      wall_loops: 3,
      infill_density: 15,
      infill_pattern: 'grid',
      supports_enabled: true,
      support_type: 'tree(auto)',
      print_settings_name: '0.20mm Standard @BBL X1C',
      filament_types: ['PLA', 'PETG'],
      filament_colors: ['#FF0000', '#00FF00'],
      filament_names: ['Bambu PLA Basic @BBL X1C', 'Bambu PETG Basic @BBL X1C'],
      plate_count: 3,
    });
  });

  it('falls back to counting <plate> tags in model_settings.config when there are no plate_N.json entries', () => {
    const profile = parseThreeMfPrintProfile(buildThreeMfWithModelSettingsPlates(4));
    expect(profile.plate_count).toBe(4);
  });

  it('returns null for a 3mf with no slicer project settings (plain mesh export)', () => {
    expect(parseThreeMfPrintProfile(buildMeshOnlyThreeMf())).toBeNull();
  });

  it('returns null instead of throwing for a non-zip / corrupt input', () => {
    expect(parseThreeMfPrintProfile(Buffer.from('not a zip file'))).toBeNull();
  });

  it('returns null instead of throwing for a missing file path', () => {
    expect(parseThreeMfPrintProfile('/nonexistent/path/model.3mf')).toBeNull();
  });
});

function createFakeDb({ existingProfile = null } = {}) {
  const run = jest.fn();
  const get = jest.fn(() => existingProfile);
  const prepare = jest.fn(() => ({ get, run, all: jest.fn(() => []) }));
  return { prepare, _run: run, _get: get };
}

describe('generatePrintProfileForAsset', () => {
  it('parses the file and upserts a profile for a new asset', () => {
    const db = createFakeDb();
    const profile = generatePrintProfileForAsset(db, 42, buildSampleThreeMf());

    expect(profile).not.toBeNull();
    expect(profile.printer_model).toBe('Bambu Lab X1 Carbon');
    expect(db._run).toHaveBeenCalledTimes(1);
    expect(db._run.mock.calls[0][0]).toBe(42); // design_asset_id is the first bound param
  });

  it('skips extraction when a profile already exists and force is not set', () => {
    const db = createFakeDb({ existingProfile: { id: 1 } });
    const profile = generatePrintProfileForAsset(db, 42, buildSampleThreeMf());

    expect(profile).toBeNull();
    expect(db._run).not.toHaveBeenCalled();
  });

  it('re-extracts and upserts when force is set, even if a profile already exists', () => {
    const db = createFakeDb({ existingProfile: { id: 1 } });
    const profile = generatePrintProfileForAsset(db, 42, buildSampleThreeMf(), { force: true });

    expect(profile).not.toBeNull();
    expect(db._run).toHaveBeenCalledTimes(1);
  });

  it('returns null and never upserts for a non-slicer 3mf', () => {
    const db = createFakeDb();
    const profile = generatePrintProfileForAsset(db, 42, buildMeshOnlyThreeMf());

    expect(profile).toBeNull();
    expect(db._run).not.toHaveBeenCalled();
  });
});

describe('formatPrintProfileRow', () => {
  it('returns null for a missing row', () => {
    expect(formatPrintProfileRow(null)).toBeNull();
  });

  it('parses JSON array columns and coerces supports_enabled to a boolean', () => {
    const row = {
      printer_model: 'Bambu Lab X1 Carbon',
      printer_settings_name: 'Bambu Lab X1 Carbon 0.4 nozzle',
      nozzle_diameter: 0.4,
      bed_type: 'Textured PEI Plate',
      layer_height: 0.2,
      first_layer_height: 0.2,
      wall_loops: 3,
      infill_density: 15,
      infill_pattern: 'grid',
      supports_enabled: 1,
      support_type: 'tree(auto)',
      print_settings_name: '0.20mm Standard @BBL X1C',
      filament_types: '["PLA","PETG"]',
      filament_colors: '["#FF0000","#00FF00"]',
      filament_names: '["Bambu PLA Basic @BBL X1C"]',
      plate_count: 2,
    };

    const formatted = formatPrintProfileRow(row);
    expect(formatted.supports_enabled).toBe(true);
    expect(formatted.filament_types).toEqual(['PLA', 'PETG']);
    expect(formatted.filament_colors).toEqual(['#FF0000', '#00FF00']);
  });

  it('tolerates malformed JSON in array columns by returning an empty array', () => {
    const row = { filament_types: 'not json', filament_colors: null, filament_names: undefined, supports_enabled: 0 };
    const formatted = formatPrintProfileRow(row);
    expect(formatted.filament_types).toEqual([]);
    expect(formatted.filament_colors).toEqual([]);
    expect(formatted.filament_names).toEqual([]);
    expect(formatted.supports_enabled).toBe(false);
  });

  it('defaults makerworld_profile_id to null when unset, and passes it through when present', () => {
    expect(formatPrintProfileRow({ supports_enabled: 0 }).makerworld_profile_id).toBeNull();
    expect(formatPrintProfileRow({ supports_enabled: 0, makerworld_profile_id: '12345' }).makerworld_profile_id).toBe('12345');
  });
});

describe('setMakerWorldProfileId', () => {
  it('updates the row for the given asset id with a stringified profile id', () => {
    const db = createFakeDb();
    setMakerWorldProfileId(db, 42, 12345);

    expect(db._run).toHaveBeenCalledTimes(1);
    expect(db._run).toHaveBeenCalledWith('12345', 42);
  });
});

describe('getPrintProfilesByAssetIds', () => {
  it('returns an empty object without querying when given no ids', () => {
    const db = createFakeDb();
    expect(getPrintProfilesByAssetIds(db, [])).toEqual({});
    expect(db.prepare).not.toHaveBeenCalled();
  });

  it('keys formatted profiles by design_asset_id', () => {
    const rows = [
      { design_asset_id: 1, printer_model: 'Bambu Lab X1 Carbon', filament_types: '[]', filament_colors: '[]', filament_names: '[]', supports_enabled: 1 },
      { design_asset_id: 2, printer_model: 'Bambu Lab P1S', filament_types: '[]', filament_colors: '[]', filament_names: '[]', supports_enabled: 0 },
    ];
    const db = { prepare: jest.fn(() => ({ all: jest.fn(() => rows) })) };

    const result = getPrintProfilesByAssetIds(db, [1, 2]);
    expect(Object.keys(result)).toEqual(['1', '2']);
    expect(result[1].printer_model).toBe('Bambu Lab X1 Carbon');
    expect(result[2].printer_model).toBe('Bambu Lab P1S');
  });
});
