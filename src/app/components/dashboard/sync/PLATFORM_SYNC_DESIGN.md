# Multi-Platform Sync Abstraction Design

## Overview

This document outlines a plan to abstract the MakerWorld sync feature into a reusable framework for syncing designs from multiple platforms (Printables, Thingiverse).

## Current Architecture

### MakerWorld-Specific Components

| File | MakerWorld-Specific | Can Be Generalized |
|------|---------------------|-------------------|
| `makerworld-sync.tsx` | API client, UI strings, captcha handling | Progress tracking, merge preview, sync flow |
| `sync/route.ts` | License/category mapping | Design CRUD, platform linking, asset records |
| `sync/download/route.ts` | CDN domain whitelist | File download, dedup, zip extraction |

### Barriers to Reuse

1. **Authentication**: Each platform has different auth flows
2. **API Clients**: Different data structures and endpoints
3. **Captcha**: MakerWorld-specific Electron window handling
4. **Field Mapping**: License/category mappings vary per platform
5. **CDN Domains**: Download routes whitelist specific domains

## Proposed Architecture

### 1. Platform Client Interface

```typescript
// src/app/lib/sync/platform-client.ts

interface DesignSummary {
  id: string;              // Platform-specific ID
  title: string;
  summary: string;
  cover?: string;          // Cover image URL
  license?: string;        // Platform's license key
  category?: string;       // Platform's category
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface DesignDetails extends DesignSummary {
  description: string;     // Full HTML description
  modelFiles: { name: string; url: string; size: number }[];
  images: { name: string; url: string }[];
}

interface DownloadInfo {
  url: string;
  name: string;
  requiresAuth?: boolean;
}

interface PlatformSyncClient {
  // Platform identification
  readonly platformId: number;      // From PLATFORM_IDS constant
  readonly platformName: string;    // Display name
  readonly platformKey: string;     // MAKERWORLD, PRINTABLES, THINGIVERSE

  // Authentication
  isAuthenticated(): boolean;

  // Design fetching
  getPublishedDesigns(): Promise<DesignSummary[]>;
  getDesignDetails(id: string): Promise<DesignDetails>;

  // Downloads
  getModelDownloadUrl(designId: string): Promise<DownloadInfo | null>;
  getInstanceDownloadUrls(designId: string): Promise<DownloadInfo[]>;
  getAllowedCdnDomains(): string[];

  // Field mapping
  mapLicenseToPubman(platformLicense: string): string;
  mapCategoryToPubman(platformCategory: string): string;
  mapLicenseFromPubman(pubmanLicense: string): string;

  // Optional: captcha handling
  handleCaptcha?(designId: string): Promise<boolean>;
}
```

### 2. Platform-Specific Implementations

```typescript
// src/app/lib/sync/makerworld-sync-client.ts
export class MakerWorldSyncClient implements PlatformSyncClient {
  readonly platformId = PLATFORM_IDS.MAKERWORLD;
  readonly platformName = "MakerWorld";
  readonly platformKey = "MAKERWORLD";

  constructor(private api: MakerWorldClientAPI, private user: MakerWorldUser) {}

  // Implementation using existing MakerWorldClientAPI...
}

// src/app/lib/sync/printables-sync-client.ts
export class PrintablesSyncClient implements PlatformSyncClient {
  readonly platformId = PLATFORM_IDS.PRINTABLES;
  readonly platformName = "Printables";
  readonly platformKey = "PRINTABLES";

  // Implementation using Printables API...
}

// src/app/lib/sync/thingiverse-sync-client.ts
export class ThingiverseSyncClient implements PlatformSyncClient {
  readonly platformId = PLATFORM_IDS.THINGIVERSE;
  readonly platformName = "Thingiverse";
  readonly platformKey = "THINGIVERSE";

  // Implementation using Thingiverse API...
}
```

### 3. Generic Sync API Routes

```typescript
// src/app/api/sync/route.ts
// Generic sync endpoint that accepts platformId
export async function POST(request: NextRequest) {
  const { platformId, design, assets, mergeConfig } = await request.json();

  // Get platform-specific mapper
  const mapper = getPlatformMapper(platformId);

  // Map fields using platform-specific logic
  const pubmanLicense = mapper.mapLicenseToPubman(design.license);
  const pubmanCategory = mapper.mapCategoryToPubman(design.category);

  // Rest of sync logic is platform-agnostic...
}

// src/app/api/sync/download/route.ts
// Generic download endpoint with platform-aware domain validation
export async function POST(request: NextRequest) {
  const { url, designId, fileName, fileType, platformId } = await request.json();

  // Get allowed domains for this platform
  const client = getSyncClient(platformId);
  const allowedDomains = client.getAllowedCdnDomains();

  // Validate URL against platform's allowed domains
  if (!isAllowedDomain(url, allowedDomains)) {
    return NextResponse.json({ error: "Unauthorized domain" }, { status: 403 });
  }

  // Rest of download logic is platform-agnostic...
}
```

### 4. Generic Sync UI Component

```typescript
// src/app/components/dashboard/sync/platform-sync.tsx

interface PlatformSyncProps {
  client: PlatformSyncClient;
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export function PlatformSync({ client, isOpen, onClose, onSyncComplete }: PlatformSyncProps) {
  // Reuse all the existing sync logic with:
  // - client.getPublishedDesigns() instead of MakerWorld-specific call
  // - client.platformName for UI strings
  // - client.handleCaptcha?.() for captcha handling
  // - client.getAllowedCdnDomains() for download validation
}
```

### 5. Platform-Specific Wrapper Components

```typescript
// src/app/components/dashboard/makerworld-sync.tsx
export function MakerWorldSync({ isOpen, onClose, onSyncComplete }) {
  const { user } = useMakerWorldAuth();
  const client = useMemo(() => new MakerWorldSyncClient(new MakerWorldClientAPI(), user), [user]);

  return <PlatformSync client={client} isOpen={isOpen} onClose={onClose} onSyncComplete={onSyncComplete} />;
}

// src/app/components/dashboard/printables-sync.tsx
export function PrintablesSync({ isOpen, onClose, onSyncComplete }) {
  const { token } = usePrintablesAuth();
  const client = useMemo(() => new PrintablesSyncClient(token), [token]);

  return <PlatformSync client={client} isOpen={isOpen} onClose={onClose} onSyncComplete={onSyncComplete} />;
}
```

## Implementation Phases

### Phase 1: Extract Common Types (Current PR)
- [x] Extract types to `sync/types.ts`
- [x] Extract dialog components
- [ ] Create `PlatformSyncClient` interface (minimal)

### Phase 2: Abstract MakerWorld Client
- [ ] Create `MakerWorldSyncClient` implementing interface
- [ ] Move platform-specific logic into the client
- [ ] Keep existing `makerworld-sync.tsx` working

### Phase 3: Create Generic Components
- [ ] Create `PlatformSync` generic component
- [ ] Refactor `makerworld-sync.tsx` to use `PlatformSync`
- [ ] Test MakerWorld sync still works

### Phase 4: Add Printables Support
- [ ] Create `PrintablesSyncClient`
- [ ] Create `printables-sync.tsx` wrapper
- [ ] Add to Printables auth dropdown
- [ ] Test end-to-end

### Phase 5: Add Thingiverse Support
- [ ] Create `ThingiverseSyncClient`
- [ ] Create `thingiverse-sync.tsx` wrapper
- [ ] Add to Thingiverse auth dropdown
- [ ] Test end-to-end

## Key Considerations

### Authentication
- MakerWorld uses Electron IPC for authenticated requests
- Printables uses OAuth tokens
- Thingiverse uses OAuth tokens
- Solution: Each client handles auth internally

### Captcha Handling
- Only MakerWorld currently requires captcha
- Solution: `handleCaptcha` is optional in interface
- Generic component checks `if (client.handleCaptcha)`

### Download Security
- Each platform has different CDN domains
- Solution: Each client provides `getAllowedCdnDomains()`
- Generic download route validates against client's list

### Field Mapping
- Licenses differ per platform (CC-BY, SDFL, etc.)
- Categories have different IDs/names
- Solution: Each client implements mapping methods

## File Structure After Refactor

```
src/app/components/dashboard/sync/
├── index.ts                       # Exports
├── types.ts                       # Shared types
├── platform-client.ts             # Interface definition
├── platform-sync.tsx              # Generic sync component
├── merge-preview-dialog.tsx       # Merge dialog
├── new-design-preview-dialog.tsx  # New design dialog
└── PLATFORM_SYNC_DESIGN.md        # This document

src/app/lib/sync/
├── makerworld-sync-client.ts      # MakerWorld implementation
├── printables-sync-client.ts      # Printables implementation
└── thingiverse-sync-client.ts     # Thingiverse implementation

src/app/api/sync/
├── route.ts                       # Generic sync API
└── download/
    └── route.ts                   # Generic download API
```

## Migration Strategy

1. Keep existing MakerWorld sync working throughout
2. Add interface alongside existing code
3. Gradually refactor to use interface
4. Add new platforms using the interface
5. Clean up MakerWorld-specific code last
