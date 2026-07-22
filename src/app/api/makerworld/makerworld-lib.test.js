import { AddPrintProfileRequestSchema, makerWorldPrinterDevModels } from './makerworld-lib';

// This is the exact request body captured from MakerWorld's own "Add Print Profile" UI
// (2026-07-21, ExoGuitar - Neck - Neck v4, design id 3075097). It's the ground truth this
// schema must keep matching - don't "clean it up" without re-verifying against a real capture.
const REAL_CAPTURED_PAYLOAD = {
  profileTitle: 'Metal Frets',
  profileSummary: '',
  profileCover: 'https://makerworld.bblmw.com/makerworld/model/20260722/2625562092/17922c675ff78059.jpeg',
  modelId: '',
  profileId: 0,
  modelSource: 'profile',
  auxiliaryPictures: [
    {
      name: 'exoguitar_neck_neck-v4--frets-plastic__photo--09_img-6459.jpeg',
      url: 'https://makerworld.bblmw.com/makerworld/model/20260722/2625562092/17922c675ff78059.jpeg',
      uploadUrl: 'https://or-cloud-makerworld-prod.s3.dualstack.us-west-2.amazonaws.com/makerworld/model/20260722/2625562092/17922c675ff78059.jpeg?X-Amz-Signature=stub',
      cdnPrefix: 'https://makerworld.bblmw.com',
    },
  ],
  auxiliaryBom: [],
  auxiliaryGuide: [],
  auxiliaryOther: [],
  designBom: [],
  designGuide: [],
  designOther: [],
  designPictures: [],
  details: ['https://makerworld.bblmw.com/makerworld/model/20260722/2625562092/d94a1d831e4ba318.png'],
  model3Mf: {
    name: 'exoguitar_neck_neck-v4--frets-metal__print--frets-metal.3mf',
    size: 3929948,
    url: 'https://makerworld.bblmw.com/makerworld/model/20260722/2625562092/51d248fba354a492.3mf',
  },
  otherCompatibility: [
    { devModelName: 'C11', devProductName: 'P1P', nozzleDiameter: 0.4 },
    { devModelName: 'BL-P002', devProductName: 'X1', nozzleDiameter: 0.4 },
    { devModelName: 'BL-P001', devProductName: 'X1 Carbon', nozzleDiameter: 0.4 },
    { devModelName: 'C13', devProductName: 'X1E', nozzleDiameter: 0.4 },
    { devModelName: 'N2S', devProductName: 'A1', nozzleDiameter: 0.4 },
    { devModelName: 'O1D', devProductName: 'H2D', nozzleDiameter: 0.4 },
    { devModelName: 'O1E', devProductName: 'H2D Pro', nozzleDiameter: 0.4 },
    { devModelName: 'O1S', devProductName: 'H2S', nozzleDiameter: 0.4 },
    { devModelName: 'N7', devProductName: 'P2S', nozzleDiameter: 0.4 },
    { devModelName: 'O1C2', devProductName: 'H2C', nozzleDiameter: 0.4 },
    { devModelName: 'N6', devProductName: 'X2D', nozzleDiameter: 0.4 },
    { devModelName: 'N9', devProductName: 'A2L', nozzleDiameter: 0.4 },
  ],
  tempDetails: [
    {
      name: '2026-07-21_eebb6d68d28b2.png',
      url: 'https://makerworld.bblmw.com/makerworld/model/20260722/2625562092/d94a1d831e4ba318.png',
      uploadUrl: 'https://or-cloud-makerworld-prod.s3.dualstack.us-west-2.amazonaws.com/makerworld/model/20260722/2625562092/d94a1d831e4ba318.png?X-Amz-Signature=stub',
      cdnPrefix: 'https://makerworld.bblmw.com',
    },
  ],
  original: [],
  picturesIsUploading: false,
  videosIsUploading: false,
  accessoriesIsUploading: false,
  profilePicturesIsUploading: false,
  templateFileIsUploading: false,
  modelDetailIsUploading: false,
  mode: 'addProfile',
  clickWhich: 'publish',
  rawModelFileIsUploading: false,
  uploading3mfStatus: 2,
  instanceSetting: {
    submitAsPrivate: false,
    isPrinterPresetChanged: true,
    isPrinterTested: true,
    isDonateToAuthor: false,
    makerLab: '',
    makerLabVersion: '',
  },
  unsupportedDevModels: [],
  syncToMWGlobal: true,
  parentId: 3075097,
  compatibility: { devModelName: 'C12', devProductName: 'P1S', nozzleDiameter: 0.4 },
  printer: { model: 'Bambu Lab P1S', variant: 0.4, settingsId: 'Bambu Lab P1S 0.4 nozzle' },
  draftSetting: { customGCode: false },
  projectSettings: { layerHeight: '0.28', wallLoops: '6', sparseInfillDensity: '55%' },
  makerLabSvg: [],
  title: 'Metal Frets',
};

describe('AddPrintProfileRequestSchema', () => {
  it('parses the exact real captured payload without altering its key fields', () => {
    const parsed = AddPrintProfileRequestSchema.parse(REAL_CAPTURED_PAYLOAD);

    expect(parsed.parentId).toBe(3075097);
    expect(parsed.mode).toBe('addProfile');
    expect(parsed.profileId).toBe(0);
    expect(parsed.modelSource).toBe('profile');
    expect(parsed.title).toBe('Metal Frets');
    expect(parsed.profileTitle).toBe('Metal Frets');
    expect(parsed.model3Mf).toEqual(REAL_CAPTURED_PAYLOAD.model3Mf);
    expect(parsed.printer).toEqual({ model: 'Bambu Lab P1S', variant: 0.4, settingsId: 'Bambu Lab P1S 0.4 nozzle' });
    expect(parsed.compatibility).toEqual({ devModelName: 'C12', devProductName: 'P1S', nozzleDiameter: 0.4 });
    expect(parsed.projectSettings).toEqual({ layerHeight: '0.28', wallLoops: '6', sparseInfillDensity: '55%' });
    expect(parsed.instanceSetting.isPrinterPresetChanged).toBe(true);
    expect(parsed.instanceSetting.isPrinterTested).toBe(true);
    expect(parsed.otherCompatibility).toHaveLength(12);
  });

  it('parentId is required - this must be the MakerWorld design id, not a draft id', () => {
    const { parentId, ...withoutParentId } = REAL_CAPTURED_PAYLOAD;
    expect(() => AddPrintProfileRequestSchema.parse(withoutParentId)).toThrow();
  });

  it('applies the addProfile-specific defaults when only the required fields are given', () => {
    const parsed = AddPrintProfileRequestSchema.parse({
      parentId: 3075097,
      title: 'My Profile',
      profileTitle: 'My Profile',
      profileCover: 'https://example.com/cover.jpeg',
      model3Mf: { name: 'model.3mf', url: 'https://example.com/model.3mf', size: 123 },
    });

    expect(parsed.mode).toBe('addProfile');
    expect(parsed.clickWhich).toBe('publish');
    expect(parsed.modelSource).toBe('profile');
    expect(parsed.uploading3mfStatus).toBe(2);
    expect(parsed.instanceSetting.isPrinterPresetChanged).toBe(true);
    expect(parsed.instanceSetting.isPrinterTested).toBe(true);
    expect(parsed.compatibility).toEqual({ devModelName: '', devProductName: '', nozzleDiameter: 0 });
  });
});

describe('makerWorldPrinterDevModels', () => {
  it('maps confirmed printers to the devModelName/devProductName seen in the real capture', () => {
    expect(makerWorldPrinterDevModels['Bambu Lab P1S']).toEqual({ devModelName: 'C12', devProductName: 'P1S' });
    expect(makerWorldPrinterDevModels['Bambu Lab X1 Carbon']).toEqual({ devModelName: 'BL-P001', devProductName: 'X1 Carbon' });
    expect(makerWorldPrinterDevModels['Bambu Lab X2D']).toEqual({ devModelName: 'N6', devProductName: 'X2D' });
  });

  it('does not guess a code for printers that were never confirmed by a real capture', () => {
    expect(makerWorldPrinterDevModels['Bambu Lab A1 mini']).toBeUndefined();
  });
});
