/**
 * Platform IDs used in the design_platform table
 * These must match the platform table in the database
 */
export const PLATFORM_IDS = {
  PUBMAN: 1,
  THINGIVERSE: 3,
  PRINTABLES: 4,
  MAKERWORLD: 5,
} as const;

export type PlatformId = typeof PLATFORM_IDS[keyof typeof PLATFORM_IDS];

/**
 * Platform names for display
 */
export const PLATFORM_NAMES: Record<PlatformId, string> = {
  [PLATFORM_IDS.PUBMAN]: 'PubMan',
  [PLATFORM_IDS.THINGIVERSE]: 'Thingiverse',
  [PLATFORM_IDS.PRINTABLES]: 'Printables',
  [PLATFORM_IDS.MAKERWORLD]: 'MakerWorld',
};

/**
 * Published status codes used in design_platform table
 */
export const PUBLISHED_STATUS = {
  DRAFT: 1,
  PUBLISHED: 2,
} as const;

export type PublishedStatus = typeof PUBLISHED_STATUS[keyof typeof PUBLISHED_STATUS];
