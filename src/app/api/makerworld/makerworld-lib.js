import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const makerWorldCategories = {
  "3D Printer": {"id": 900, "path": ["3D Printer"], "pathIds": [900], "disabled": true},
  "3D Printer Accessories": {"id": 901, "path": ["3D Printer", "3D Printer Accessories"], "pathIds": [900, 901]},
  "3D Printer Parts": {"id": 902, "path": ["3D Printer", "3D Printer Parts"], "pathIds": [900, 902]},
  "Test Models": {"id": 903, "path": ["3D Printer", "Test Models"], "pathIds": [900, 903]},
  "Art": {"id": 100, "path": ["Art"], "pathIds": [100], "disabled": true},
  "2D Art": {"id": 101, "path": ["Art", "2D Art"], "pathIds": [100, 101]},
  "Coin & Badges": {"id": 103, "path": ["Art", "Coin & Badges"], "pathIds": [100, 103]},
  "Signs & Logos": {"id": 102, "path": ["Art", "Signs & Logos"], "pathIds": [100, 102]},
  "Sculptures": {"id": 104, "path": ["Art", "Sculptures"], "pathIds": [100, 104]},
  "Other Art Models": {"id": 105, "path": ["Art", "Other Art Models"], "pathIds": [100, 105]},
  "Education": {"id": 500, "path": ["Education"], "pathIds": [500], "disabled": true},
  "Biology": {"id": 503, "path": ["Education", "Biology"], "pathIds": [500, 503]},
  "Chemistry": {"id": 505, "path": ["Education", "Chemistry"], "pathIds": [500, 505]},
  "Engineering": {"id": 501, "path": ["Education", "Engineering"], "pathIds": [500, 501]},
  "Geography": {"id": 506, "path": ["Education", "Geography"], "pathIds": [500, 506]},
  "Mathematics": {"id": 502, "path": ["Education", "Mathematics"], "pathIds": [500, 502]},
  "Physics & Astronomy": {"id": 504, "path": ["Education", "Physics & Astronomy"], "pathIds": [500, 504]},
  "Other Education Models": {"id": 507, "path": ["Education", "Other Education Models"], "pathIds": [500, 507]},
  "Fashion": {"id": 200, "path": ["Fashion"], "pathIds": [200], "disabled": true},
  "Bags": {"id": 201, "path": ["Fashion", "Bags"], "pathIds": [200, 201]},
  "Clothes": {"id": 202, "path": ["Fashion", "Clothes"], "pathIds": [200, 202]},
  "Earrings": {"id": 206, "path": ["Fashion", "Earrings"], "pathIds": [200, 206]},
  "Footwear": {"id": 204, "path": ["Fashion", "Footwear"], "pathIds": [200, 204]},
  "Glasses": {"id": 203, "path": ["Fashion", "Glasses"], "pathIds": [200, 203]},
  "Jewelry": {"id": 208, "path": ["Fashion", "Jewelry"], "pathIds": [200, 208]},
  "Rings": {"id": 205, "path": ["Fashion", "Rings"], "pathIds": [200, 205]},
  "Other Fashion Models": {"id": 207, "path": ["Fashion", "Other Fashion Models"], "pathIds": [200, 207]},
  "Hobby & DIY": {"id": 300, "path": ["Hobby & DIY"], "pathIds": [300], "disabled": true},
  "Electronics": {"id": 301, "path": ["Hobby & DIY", "Electronics"], "pathIds": [300, 301]},
  "Music": {"id": 303, "path": ["Hobby & DIY", "Music"], "pathIds": [300, 303]},
  "RC": {"id": 304, "path": ["Hobby & DIY", "RC"], "pathIds": [300, 304]},
  "Robotics": {"id": 305, "path": ["Hobby & DIY", "Robotics"], "pathIds": [300, 305]},
  "Sport & Outdoors": {"id": 306, "path": ["Hobby & DIY", "Sport & Outdoors"], "pathIds": [300, 306]},
  "Vehicles": {"id": 302, "path": ["Hobby & DIY", "Vehicles"], "pathIds": [300, 302]},
  "Other Hobby & DIY": {"id": 307, "path": ["Hobby & DIY", "Other Hobby & DIY"], "pathIds": [300, 307]},
  "Household": {"id": 400, "path": ["Household"], "pathIds": [400], "disabled": true},
  "Decor": {"id": 401, "path": ["Household", "Decor"], "pathIds": [400, 401]},
  "Festivities": {"id": 403, "path": ["Household", "Festivities"], "pathIds": [400, 403]},
  "Garden": {"id": 402, "path": ["Household", "Garden"], "pathIds": [400, 402]},
  "Office": {"id": 404, "path": ["Household", "Office"], "pathIds": [400, 404]},
  "Pets": {"id": 405, "path": ["Household", "Pets"], "pathIds": [400, 405]},
  "Other House Models": {"id": 406, "path": ["Household", "Other House Models"], "pathIds": [400, 406]},
  "Miniatures": {"id": 600, "path": ["Miniatures"], "pathIds": [600], "disabled": true},
  "Animals": {"id": 601, "path": ["Miniatures", "Animals"], "pathIds": [600, 601]},
  "Architecture": {"id": 602, "path": ["Miniatures", "Architecture"], "pathIds": [600, 602]},
  "Creatures": {"id": 603, "path": ["Miniatures", "Creatures"], "pathIds": [600, 603]},
  "People": {"id": 604, "path": ["Miniatures", "People"], "pathIds": [600, 604]},
  "Other Miniatures": {"id": 605, "path": ["Miniatures", "Other Miniatures"], "pathIds": [600, 605]},
  "Props & Cosplays": {"id": 1000, "path": ["Props & Cosplays"], "pathIds": [1000], "disabled": true},
  "Costumes": {"id": 1003, "path": ["Props & Cosplays", "Costumes"], "pathIds": [1000, 1003]},
  "Masks & Helmets": {"id": 1001, "path": ["Props & Cosplays", "Masks & Helmets"], "pathIds": [1000, 1001]},
  "Cosplay Weapons": {"id": 1002, "path": ["Props & Cosplays", "Cosplay Weapons"], "pathIds": [1000, 1002]},
  "Other Props & Cosplays": {"id": 1004, "path": ["Props & Cosplays", "Other Props & Cosplays"], "pathIds": [1000, 1004]},
  "Tools": {"id": 700, "path": ["Tools"], "pathIds": [700], "disabled": true},
  "Gadgets": {"id": 705, "path": ["Tools", "Gadgets"], "pathIds": [700, 705]},
  "Hand Tools": {"id": 703, "path": ["Tools", "Hand Tools"], "pathIds": [700, 703]},
  "Machine Tools": {"id": 704, "path": ["Tools", "Machine Tools"], "pathIds": [700, 704]},
  "Measure Tools": {"id": 702, "path": ["Tools", "Measure Tools"], "pathIds": [700, 702]},
  "Medical Tools": {"id": 707, "path": ["Tools", "Medical Tools"], "pathIds": [700, 707]},
  "Organizers": {"id": 701, "path": ["Tools", "Organizers"], "pathIds": [700, 701]},
  "Other Tools": {"id": 706, "path": ["Tools", "Other Tools"], "pathIds": [700, 706]},
  "Toys & Games": {"id": 800, "path": ["Toys & Games"], "pathIds": [800], "disabled": true},
  "Board Games": {"id": 802, "path": ["Toys & Games", "Board Games"], "pathIds": [800, 802]},
  "Characters": {"id": 801, "path": ["Toys & Games", "Characters"], "pathIds": [800, 801]},
  "Outdoor Toys": {"id": 803, "path": ["Toys & Games", "Outdoor Toys"], "pathIds": [800, 803]},
  "Puzzles": {"id": 804, "path": ["Toys & Games", "Puzzles"], "pathIds": [800, 804]},
  "Construction Sets": {"id": 806, "path": ["Toys & Games", "Construction Sets"], "pathIds": [800, 806]},
  "Other Toys & Games": {"id": 805, "path": ["Toys & Games", "Other Toys & Games"], "pathIds": [800, 805]},
  "Generative 3D Model": {"id": 2000, "path": ["Generative 3D Model"], "pathIds": [2000], "disabled": true},
  "Hueforge & Lithophane": {"id": 2001, "path": ["Generative 3D Model", "Hueforge & Lithophane"], "pathIds": [2000, 2001]},
  "Make My Sign": {"id": 2002, "path": ["Generative 3D Model", "Make My Sign"], "pathIds": [2000, 2002]},
  "Make My Vase": {"id": 2003, "path": ["Generative 3D Model", "Make My Vase"], "pathIds": [2000, 2003]},
  "Pixel Puzzle Maker": {"id": 2004, "path": ["Generative 3D Model", "Pixel Puzzle Maker"], "pathIds": [2000, 2004]},
  "Relief Sculpture Maker": {"id": 2005, "path": ["Generative 3D Model", "Relief Sculpture Maker"], "pathIds": [2000, 2005]},
  "AI Scanner": {"id": 2006, "path": ["Generative 3D Model", "AI Scanner"], "pathIds": [2000, 2006]},
  "Image to Keychain": {"id": 2007, "path": ["Generative 3D Model", "Image to Keychain"], "pathIds": [2000, 2007]},
  "Make My Desk Organizer": {"id": 2008, "path": ["Generative 3D Model", "Make My Desk Organizer"], "pathIds": [2000, 2008]},
  "PrintMon Maker": {"id": 2009, "path": ["Generative 3D Model", "PrintMon Maker"], "pathIds": [2000, 2009]},
  "Statue Maker": {"id": 2010, "path": ["Generative 3D Model", "Statue Maker"], "pathIds": [2000, 2010]},
  "Christmas Ornament Maker": {"id": 2011, "path": ["Generative 3D Model", "Christmas Ornament Maker"], "pathIds": [2000, 2011]},
  "Make My Lantern": {"id": 2012, "path": ["Generative 3D Model", "Make My Lantern"], "pathIds": [2000, 2012]}
};

export const makerWorldLicenses = {
  "CC0": { name: "Creative Commons Public Domain" },
  "BY": { name: "Creative Commons Attribution" },
  "BY-SA": { name: "Creative Commons Attribution-Share Alike" },
  "BY-ND": { name: "Creative Commons Attribution-NoDerivatives" },
  "BY-NC": { name: "Creative Commons Attribution-Noncommercial" },
  "BY-NC-SA": { name: "Creative Commons Attribution-Noncommercial-Share Alike" },
  "BY-NC-ND": { name: "Creative Commons Attribution-Noncommercial-NoDerivatives" },
  "Standard Digital File License": { name: "Standard Digital File License" }
};

export const licenseToMakerWorldMap = {
  'CC-BY': 'BY',             // Creative Commons - Attribution
  'CC-BY-SA': 'BY-SA',       // Creative Commons - Attribution - Share Alike
  'CC-BY-ND': 'BY-ND',       // Creative Commons - Attribution - No Derivatives
  'CC-BY-NC': 'BY-NC',       // Creative Commons - Attribution - Non-Commercial
  'CC-BY-NC-SA': 'BY-NC-SA', // Creative Commons - Attribution - Non-Commercial - Share Alike
  'CC-BY-NC-ND': 'BY-NC-ND', // Creative Commons - Attribution - Non-Commercial - No Derivatives
  'CC': 'CC0',               // Creative Commons - Public Domain Dedication aka CC Zero
  'CC0': 'CC0',              // Creative Commons - Public Domain Dedication aka CC Zero
  'GPL-2.0': 'INVALID',      // GNU General Public License v2.0 (not supported by MakerWorld)
  'GPL-3.0': 'INVALID',      // GNU General Public License v3.0 (not supported by MakerWorld)
  'LGPL': 'INVALID',         // GNU Lesser General Public License (not supported by MakerWorld)
  'BSD': 'INVALID',          // BSD License (not supported by MakerWorld)
  'SDFL': 'Standard Digital File License' // Standard Design File License
};

export const makerWorldImageFileTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export function isPubmanLicenseSupported(pubmanLicense) {
  const license = licenseToMakerWorldMap[pubmanLicense];
  return license in makerWorldLicenses;
}

// Reverse mapping: MakerWorld license to PubMan license
export const makerWorldLicenseToPubmanMap = {
  'CC0': 'CC0',                          // Creative Commons Public Domain
  'BY': 'CC-BY',                         // Creative Commons Attribution
  'BY-SA': 'CC-BY-SA',                   // Creative Commons Attribution-Share Alike
  'BY-ND': 'CC-BY-ND',                   // Creative Commons Attribution-NoDerivatives
  'BY-NC': 'CC-BY-NC',                   // Creative Commons Attribution-Noncommercial
  'BY-NC-SA': 'CC-BY-NC-SA',             // Creative Commons Attribution-Noncommercial-Share Alike
  'BY-NC-ND': 'CC-BY-NC-ND',             // Creative Commons Attribution-Noncommercial-NoDerivatives
  'Standard Digital File License': 'SDFL' // Standard Design File License
};

/**
 * Convert MakerWorld license to PubMan license
 * @param {string} mwLicense - MakerWorld license key
 * @returns {string} PubMan license key, defaults to 'SDFL' if not found
 */
export function makerWorldLicenseToPubman(mwLicense) {
  return makerWorldLicenseToPubmanMap[mwLicense] || 'SDFL';
}

/**
 * Normalize any license key to MakerWorld format for comparison
 * @param {string} license - License key (PubMan or MakerWorld format)
 * @returns {string} MakerWorld format license key
 */
export function normalizeLicenseKey(license) {
  if (!license) return '';
  // If it's a PubMan format, convert to MakerWorld
  if (licenseToMakerWorldMap[license]) {
    return licenseToMakerWorldMap[license];
  }
  // Already MakerWorld format or unknown
  return license;
}

/**
 * Get display name for a license key (works with both PubMan and MakerWorld formats)
 * @param {string} license - License key
 * @returns {string} Human-readable license name
 */
export function getLicenseDisplayName(license) {
  if (!license) return '(none)';
  // Normalize to MakerWorld format first
  const normalized = normalizeLicenseKey(license);
  // Look up display name
  if (makerWorldLicenses[normalized]) {
    return makerWorldLicenses[normalized].name;
  }
  // Fallback to the key itself
  return license;
}

/**
 * Check if two license keys are equivalent (handles both PubMan and MakerWorld formats)
 * @param {string} license1 - First license key
 * @param {string} license2 - Second license key
 * @returns {boolean} True if licenses are equivalent
 */
export function licensesAreEqual(license1, license2) {
  return normalizeLicenseKey(license1) === normalizeLicenseKey(license2);
}

// Build reverse mapping: category ID to category name
const categoryIdToNameMap = {};
for (const [name, data] of Object.entries(makerWorldCategories)) {
  if (!data.disabled) {
    categoryIdToNameMap[data.id] = name;
  }
}

/**
 * Convert MakerWorld category ID to PubMan category name
 * @param {number} categoryId - MakerWorld category ID
 * @returns {string|null} PubMan category name, or null if not found
 */
export function makerWorldCategoryIdToPubman(categoryId) {
  return categoryIdToNameMap[categoryId] || null;
}

// --- Error class ---
export class MakerWorldAPIError extends Error {
  constructor({ message, url, method, requestBody, responseStatus, responseStatusText, responseBody, validationIssues }) {
    super(message);
    this.name = 'MakerWorldAPIError';
    this.url = url;
    this.method = method;
    this.requestBody = requestBody;
    this.responseStatus = responseStatus;
    this.responseStatusText = responseStatusText;
    this.responseBody = responseBody;
    this.validationIssues = validationIssues;
  }

  toLogString() {
    return [
      `[MakerWorldAPIError] ${this.message}`,
      this.url && `URL: ${this.url}`,
      this.method && `Method: ${this.method}`,
      this.requestBody && `Request Body: ${JSON.stringify(this.requestBody)}`,
      this.responseStatus && `Response Status: ${this.responseStatus} ${this.responseStatusText}`,
      this.responseBody && `Response Body: ${typeof this.responseBody === 'string' ? this.responseBody : JSON.stringify(this.responseBody)}`,
      this.validationIssues && `Validation Issues: ${JSON.stringify(this.validationIssues, null, 2)}`
    ].filter(Boolean).join('\n');
  }
}

// --- Zod Schemas ---

// Login request and response
export const LoginRequestSchema = z.object({
  account: z.string(),
  password: z.string(),
});
export const LoginResponseSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
  refreshExpiresIn: z.number().optional(),
  tfaKey: z.string().optional(),
  accessMethod: z.string().optional(),
  loginType: z.string().optional(),
});

// Login verify code request and response
export const LoginVerifyCodeRequestSchema = z.object({
  account: z.string(),
  code: z.string(),
});
export const LoginVerifyTfaKeyRequestSchema = z.object({
  tfaCode: z.string(),
  tfaKey: z.string(),
})
export const LoginVerifyCodeResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  refreshExpiresIn: z.number(),
  tfaKey: z.string(),
  accessMethod: z.string(),
  loginType: z.string(),
});

// User info response
export const UserInfoResponseSchema = z.object({
  uid: z.number(),
  name: z.string(),
  handle: z.string(),
  avatar: z.string(),
  backgroundUrl: z.string(),
}).passthrough();

// Drafts list response
export const DraftSummarySchema = z.object({
  // Only a subset of fields for brevity; expand as needed
  id: z.number(),
  designId: z.number(),
  title: z.string(),
  summary: z.string(),
  categoryId: z.number(),
  tags: z.array(z.string()),
  cover: z.string(),
  updateTime: z.string(),
  createTime: z.string(),
  status: z.number(),
}).passthrough();

export const GetDraftsResponseSchema = z.object({
  hits: z.array(DraftSummarySchema),
  total: z.number(),
});

// Draft detail response (getDraftById)
export const ModelFileSchema = z.object({
  isAutoGenerated: z.boolean(),
  isDir: z.boolean(),
  modelName: z.string(),
  modelSize: z.number(),
  modelType: z.string(),
  modelUpdateTime: z.string().default(""),
  modelUrl: z.string(),
  thumbnailName: z.string().default(""),
  thumbnailSize: z.number().default(0),
  thumbnailUrl: z.string().default(""),
  unikey: z.string(),
}).passthrough();

export const DesignPictureSchema = z.object({
  name: z.string(),
  url: z.string(),
}).passthrough();

export const DraftDetailResponseSchema = z.object({
  id: z.number(),
  designId: z.number(),
  title: z.string(),
  summary: z.string(),
  categoryId: z.number(),
  tags: z.array(z.string()),
  cover: z.string(),
  updateTime: z.string(),
  createTime: z.string(),
  status: z.number(),
  license: z.string(),
  nsfw: z.boolean(),
  modelFiles: z.array(ModelFileSchema),
  designPictures: z.array(DesignPictureSchema),
  // ...add more fields as needed
}).passthrough();

// Update draft request body
export const UpdateDraftRequestSchema = z.object({
  id: z.number().default(0),
  designId: z.number().default(0),
  parentId: z.number().default(0),
  title: z.string().default(""),
  profileTitle: z.string().default(""),
  summary: z.string().default(""),
  profileSummary: z.string().default(""),
  categoryId: z.number().nullable().default(null),
  tags: z.array(z.string()).default([]),
  cover: z.string().default(""),
  profileCover: z.string().default(""),
  nsfw: z.boolean().default(false),
  modelId: z.string().default(""),
  profileId: z.number().default(0),
  license: z.string().default("Standard Digital File License"),
  region: z.string().default(""),
  modelSource: z.string().default("original"),
  original: z.array(z.any()).default([]),
  auxiliaryPictures: z.array(z.any()).default([]),
  auxiliaryBom: z.array(z.any()).default([]),
  auxiliaryGuide: z.array(z.any()).default([]),
  auxiliaryOther: z.array(z.any()).default([]),
  designBom: z.array(z.any()).default([]),
  designGuide: z.array(z.any()).default([]),
  designOther: z.array(z.any()).default([]),
  designPictures: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
    })
  ).default([]),
  details: z.array(z.any()).default([]),
  model3Mf: z.object({
    name: z.string().default(""),
    url: z.string().default(""),
    size: z.number().default(0),
  }).default({ name: "", url: "", size: 0 }),
  otherCompatibility: z.array(z.any()).default([]),
  modelFiles: z.array(
    z.object({
      file: z.object({ path: z.string() }).optional(),
      thumbnailName: z.string().default(""),
      thumbnailSize: z.number().default(0),
      thumbnailUrl: z.string().nullable().default(null),
      modelName: z.string().default(""),
      modelSize: z.number().default(0),
      modelUrl: z.string().default(""),
      modelType: z.string().default(""),
      isAutoGenerated: z.boolean().default(false),
      uploadStatus: z.any().nullable().default(null),
      unikey: z.string().default(""),
      note: z.string().default(""),
      modelUpdateTime: z.string().default(""),
      scadConfig: z.string().default(""),
      uploadImageStatus: z.any().nullable().default(null),
    })
  ).default([]),
  tempDetails: z.array(z.any()).default([]),
  picturesIsUploading: z.boolean().default(false),
  accessoriesIsUploading: z.boolean().default(false),
  profilePicturesIsUploading: z.boolean().default(false),
  templateFileIsUploading: z.boolean().default(false),
  modelDetailIsUploading: z.boolean().default(false),
  mode: z.string().default("uploadFile"),
  clickWhich: z.string().default("next"),
  rawModelFileIsUploading: z.boolean().default(false),
  uploading3mfStatus: z.number().default(0),
  designSetting: z.object({
    submitAsPrivate: z.boolean().default(false),
    makerLab: z.string().default(""),
    makerLabVersion: z.string().default(""),
  }).default({ submitAsPrivate: false, makerLab: "", makerLabVersion: "" }),
  draftSetting: z.object({
    createStep: z.string().default(""),
    createWith3mf: z.boolean().default(false),
    customGCode: z.boolean().default(false),
  }).default({ createStep: "", createWith3mf: false, customGCode: false }),
  instanceSetting: z.object({
    submitAsPrivate: z.boolean().default(false),
    isPrinterPresetChanged: z.boolean().default(false),
    isPrinterTested: z.boolean().default(false),
    isDonateToAuthor: z.boolean().default(false),
    makerLab: z.string().default(""),
    makerLabVersion: z.string().default(""),
  }).default({
    submitAsPrivate: false,
    isPrinterPresetChanged: false,
    isPrinterTested: false,
    isDonateToAuthor: false,
    makerLab: "",
    makerLabVersion: "",
  }),
  bomsNeeded: z.boolean().default(false),
  boms: z.array(z.any()).default([]),
  bomsOfFilaments: z.array(z.any()).default([]),
  coverPortrait: z.string().default(""),
  coverIsUploading: z.boolean().default(false),
  appCoverIsUploading: z.boolean().default(false),
  bomsOfOtherPartList: z.array(z.any()).default([]),
  syncToMWGlobal: z.boolean().default(true),
  cyberBrick: z.object({
    cyberBrickNeeded: z.boolean().default(false),
    controlConfig: z.array(z.any()).default([]),
    motionConfig: z.array(z.any()).default([]),
    mainControlConfig: z.object({
      uniKey: z.string().default(""),
      name: z.string().default(""),
      size: z.number().default(0),
      url: z.string().default(""),
    }).default({ uniKey: "", name: "", size: 0, url: "" }),
    isOfficialController: z.boolean().default(true),
    controllerCover: z.object({
      name: z.string().default(""),
      url: z.string().default(""),
    }).default({ name: "", url: "" }),
    switchCovers: z.array(z.any()).default([]),
  }).default({
    cyberBrickNeeded: false,
    controlConfig: [],
    motionConfig: [],
    mainControlConfig: { uniKey: "", name: "", size: 0, url: "" },
    isOfficialController: true,
    controllerCover: { name: "", url: "" },
    switchCovers: [],
  }),
  rcControlConfigIsUploading: z.boolean().default(false),
  rcMotionFileIsUploading: z.boolean().default(false),
  rcMainControlConfigIsUploading: z.string().default(""),
  rcControllerCoverIsUploading: z.boolean().default(false),
  rcSwitchesCoverIsUploading: z.boolean().default(false),
  printer: z.object({
    model: z.string().default(""),
    variant: z.number().default(0),
    settingsId: z.string().default(""),
  }).default({ model: "", variant: 0, settingsId: "" }),
  compatibility: z.object({
    devModelName: z.string().default(""),
    devProductName: z.string().default(""),
    nozzleDiameter: z.number().default(0),
  }).default({ devModelName: "", devProductName: "", nozzleDiameter: 0 }),
  topNavigationArr: z.array(
    z.object({
      label: z.string(),
      step: z.string(),
      status: z.number(),
      link: z.string(),
    })
  ).default([
    { label: "Upload", step: "upload", status: 2, link: "" },
    { label: "Model Information", step: "model_information", status: 0, link: "" },
  ]),
  scadIsVaildating: z.boolean().default(false),
});

// --- End Zod Schemas ---

export class MakerWorldAPI {
  constructor(accessToken = '') {
    this.bblApiUrl = 'https://api.bambulab.com'
    this.mwApiUrl = 'https://makerworld.com/api'
    this.bblUrl = 'https://bambulab.com';
    this.headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Host': 'makerworld.com',
      'Content-Type': 'application/json',
    };
  }

  setAccessToken(accessToken) {
    this.headers.Authorization = `Bearer ${accessToken}`;
  }

  async fetch(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new MakerWorldAPIError({
        message: 'MakerWorld API error',
        url,
        method: options.method,
        requestBody: options.body,
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseBody: body,
      });
    }

    const responseText = await response.text();
    try {
      return responseText ? JSON.parse(responseText) : null;
    } catch (err) {
      throw new MakerWorldAPIError({
        message: err.message,
        url,
        method: options.method,
        requestBody: options.body,
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseBody: responseText,
      })
    }
  }

  async fetchWithoutAuth(url, options = {}) {
    // Remove Authorization header for unauthenticated requests
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { Authorization: _, ...headersWithoutAuth } = this.headers;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headersWithoutAuth,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new MakerWorldAPIError({
        message: 'MakerWorld API error',
        url,
        method: options.method,
        requestBody: options.body,
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseBody: body,
      });
    }

    return response;
  }

  // Auth
  async login(email, password) {
    const url = `${this.bblApiUrl}/v1/user-service/user/login`;
    const bodyObj = { account: email, password };
    const body = JSON.stringify(bodyObj);
    const res = await this.fetchWithoutAuth(url, {
      method: 'POST',
      body,
    });
    const resBody = await res.json();
    const parsed = LoginResponseSchema.safeParse(resBody);
    if (!parsed.success) {
      throw new MakerWorldAPIError({
        message: 'Invalid login response',
        url,
        method: 'POST',
        requestBody: bodyObj,
        responseBody: resBody,
        validationIssues: parsed.error.issues,
      });
    }
    return parsed.data;
  }

  // Verify code
  async loginVerifyCode(email, code) {
    const url = `${this.bblApiUrl}/v1/user-service/user/login`;
    const bodyObj = { account: email, code };
    const body = JSON.stringify(bodyObj);
    const res = await this.fetchWithoutAuth(url, {
      method: 'POST',
      body,
    });
    const resBody = await res.json();
    const parsed = LoginVerifyCodeResponseSchema.safeParse(resBody);
    if (!parsed.success) {
      throw new MakerWorldAPIError({
        message: 'Invalid loginVerifyCode response',
        url,
        method: 'POST',
        requestBody: bodyObj,
        responseBody: resBody,
        validationIssues: parsed.error.issues,
      });
    }
    return parsed.data;
  }

  // Verify TFA code
  async loginVerifyTfaCode(tfaCode, tfaKey) {
    const url = `${this.bblUrl}/api/sign-in/tfa`;
    const bodyObj = { tfaCode, tfaKey };
    const body = JSON.stringify(bodyObj);
    const res = await this.fetchWithoutAuth(url, {
      method: 'POST',
      body,
    });
    const resText = await res.text();
    const token_cookie = res.headers.getSetCookie().find(cookie => cookie.startsWith('token='));
    const token = token_cookie ? token_cookie.slice("token=".length, token_cookie.indexOf(';')): undefined;
    if (!token) {
      throw new MakerWorldAPIError({
        message: 'No token received from TFA verification',
        url,
        method: 'POST',
        requestBody: bodyObj,
        responseBody: resText,
      });
    }
    return {accessToken: token};
  }

  // Get user info
  async getUserInfo() {
    const url = `${this.bblApiUrl}/v1/design-user-service/my/preference`;
    const res = await this.fetch(url, {
      method: 'GET',
    });
    const parsed = UserInfoResponseSchema.safeParse(res);
    if (!parsed.success) {
      throw new MakerWorldAPIError({
        message: 'Invalid user info response',
        url,
        method: 'GET',
        responseBody: res,
        validationIssues: parsed.error.issues,
      });
    }
    return parsed.data;
  }

  // Get user design drafts
  async getDrafts() {
    const url = `${this.mwApiUrl}/v1/design-service/my/drafts`;
    const res = await this.fetch(url, {
      method: 'GET',
    });
    const parsed = GetDraftsResponseSchema.safeParse(res);
    if (!parsed.success) {
      throw new MakerWorldAPIError({
        message: 'Invalid getDrafts response',
        url,
        method: 'GET',
        responseBody: res,
        validationIssues: parsed.error.issues,
      });
    }
    return parsed.data;
  }

  // Get design draft by ID
  async getDraftById(draftId) {
    const url = `${this.mwApiUrl}/v1/design-service/my/draft/${draftId}`;
    const res = await this.fetch(url, {
      method: 'GET',
    });
    const parsed = DraftDetailResponseSchema.safeParse(res);
    if (!parsed.success) {
      throw new MakerWorldAPIError({
        message: 'Invalid getDraftById response',
        url,
        method: 'GET',
        responseBody: res,
        validationIssues: parsed.error.issues,
      });
    }
    return parsed.data;
  }

  // Create a new draft
  async createDraft(draftData) {
    const url = `${this.mwApiUrl}/v1/design-service/my/draft`;
    const reqParsed = UpdateDraftRequestSchema.safeParse(draftData);
    if (!reqParsed.success) {
      throw new MakerWorldAPIError({
        message: 'Invalid createDraft request',
        url,
        method: 'POST',
        requestBody: draftData,
        validationIssues: reqParsed.error.issues,
      });
    }
    return await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(reqParsed.data),
    });
  }

  // Update an existing draft
  async updateDraft(draftId, draftData) {
    const url = `${this.mwApiUrl}/v1/design-service/my/draft/${draftId}`;
    const reqParsed = UpdateDraftRequestSchema.safeParse(draftData);
    if (!reqParsed.success) {
      throw new MakerWorldAPIError({
        message: 'Invalid updateDraft request',
        url: `${this.mwApiUrl}/v1/design-service/my/draft/${draftId}`,
        method: 'PUT',
        requestBody: draftData,
        validationIssues: reqParsed.error.issues,
      });
    }
    await this.fetch(url, {
      method: 'PUT',
      body: JSON.stringify(reqParsed.data),
    });
    return null // No response expected, just confirmation of success
  }

  // Publish design draft
  async publishDraft(draftId) {
    const url = `${this.mwApiUrl}/v1/design-service/my/draft/${draftId}/submit`;
    await this.fetch(url, {
      method: 'POST',
    });
    return null; // No response expected, just confirmation of success
  }

  // Get a short-lived auth config for S3 file uploading
  async getS3Config() {
    const url = `${this.mwApiUrl}/v1/user-service/my/s3config?useType=1`;
    return await this.fetch(url, {
      method: 'GET',
    });
  }

  async uploadToS3(fileName, fileBuffer, userId, s3Config) {
    const client = new S3Client({
      region: s3Config.region,
      endpoint: `https://${s3Config.endpoint}`,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.accessKeySecret,
        sessionToken: s3Config.securityToken,
      },
    });
    const today = new Date().toISOString().slice(0, 10);
    const randomHex = Math.random().toString(16).slice(2, 16);
    const fileExt = fileName.split('.').pop();
    const key = `makerworld/user/${userId}/draft/${today}_${randomHex}.${fileExt}`
    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentDisposition: `attachment; filename="${fileName}"`,
      ContentType: 'application/octet-stream',
    });
    const res = await client.send(command);
    return {
      url: `${s3Config.cdnUrl}/${key}`,
      response: res,
    }
  }

  // Upload a file to MakerWorld (placeholder, adjust endpoint as needed)
  async uploadFile(fileName, fileBuffer, userId) {
    if (!fileName || !fileBuffer || !userId) {
      throw new MakerWorldAPIError({
        message: 'Invalid parameters for file upload',
        validationIssues: !fileName ? 'File name is required' : !fileBuffer ? 'File buffer is required' : !userId ? 'User ID is required' : null,
      });
    }
    const s3Config = await this.getS3Config();
    if (!s3Config || !s3Config.bucketName) {
      throw new MakerWorldAPIError({
        message: 'Failed to get S3 configuration',
        url: `${this.mwApiUrl}/v1/user-service/my/s3config?useType=1`,
        method: 'GET',
      });
    }

    return await this.uploadToS3(fileName, fileBuffer, userId, s3Config);
  }
}
