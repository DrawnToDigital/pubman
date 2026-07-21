'use client';

import { useState, Fragment } from "react";
import { PlatformPublishing, PlatformPublishingProps } from "./platform-publishing";
import { isPubmanLicenseSupported, makerWorldImageFileTypes, licenseToMakerWorldMap, makerWorldCategories, UpdateDraftRequestSchema, AddPrintProfileRequestSchema, makerWorldPrinterDevModels } from "@/src/app/api/makerworld/makerworld-lib";
import { useMakerWorldAuth, MakerWorldUser } from "@/src/app/contexts/MakerWorldAuthContext";
import { MakerWorldClientAPI, getMakerWorldStatusName } from "@/src/app/lib/makerworld-client";
import { Button } from "@/src/app/components/ui/button";
import { fetchDesign } from "@/src/app/actions/design";
import { DesignSchema } from "@/src/app/components/design/types";
import log from 'electron-log/renderer';

// Browser-compatible path join (simple version for assets)
function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

// Helper to get Electron FS API
function getElectronFS() {
  if (!window.electron?.fs?.readFile) {
    throw new Error('Electron FS not available');
  }
  return window.electron.fs;
}

// Helper to get app data path
async function getAppDataPath(): Promise<string> {
  if (!window.electron?.getAppDataPath) {
    throw new Error('Electron getAppDataPath not available');
  }
  return window.electron.getAppDataPath();
}

// Upload asset to MakerWorld S3
async function uploadAsset(
  api: MakerWorldClientAPI,
  asset: { file_name: string; file_ext: string; url: string },
  userId: number,
  appDataPath: string
): Promise<{ url: string; size: number }> {
  const fs = getElectronFS();
  // Extract relative path from local:// URL (e.g., "local:///assets/designs/01234/file.jpg" -> "/assets/designs/01234/file.jpg")
  const relativePath = asset.url.replace(/^local:\/\//, '');
  const filePath = joinPath(appDataPath, relativePath);
  log.info(`[MakerWorld] Uploading asset: ${asset.file_name} from ${filePath}`);
  const fileBuffer = await fs.readFile(filePath);
  const result = await api.uploadFile(asset.file_name, fileBuffer, userId);
  log.info(`[MakerWorld] Asset uploaded: ${asset.file_name} (${fileBuffer.byteLength} bytes) -> ${result.url}`);
  return { url: result.url, size: fileBuffer.byteLength };
}

// Publish design to MakerWorld
async function publishToMakerWorld(
  api: MakerWorldClientAPI,
  design: PlatformPublishingProps['design'],
  user: MakerWorldUser,
  options?: { existingDraftId?: string | number; existingDesignId?: string | number; isPublished?: boolean }
): Promise<{ draftId: number; designId: number }> {
  const appDataPath = await getAppDataPath();
  const { existingDraftId, existingDesignId, isPublished } = options || {};

  log.info(`[MakerWorld] publishToMakerWorld called:`, {
    designName: design.main_name,
    assetCount: design.assets.length,
    existingDraftId,
    existingDesignId,
    isPublished,
    userId: user.uid,
  });

  // Upload all assets to S3
  const uploadedAssets: { images: { name: string; url: string }[]; models: { name: string; url: string; size: number }[] } = {
    images: [],
    models: [],
  };

  log.info(`[MakerWorld] Uploading ${design.assets.length} assets...`);
  for (const asset of design.assets) {
    const ext = asset.file_ext.toLowerCase();
    const { url, size } = await uploadAsset(api, asset, user.uid, appDataPath);

    if (makerWorldImageFileTypes.includes(ext)) {
      uploadedAssets.images.push({ name: asset.file_name, url });
    } else {
      // Assume it's a model file
      uploadedAssets.models.push({ name: asset.file_name, url, size });
    }
  }
  log.info(`[MakerWorld] Assets uploaded: ${uploadedAssets.images.length} images, ${uploadedAssets.models.length} models`);

  // Get the MakerWorld license key
  const mwLicense = licenseToMakerWorldMap[design.license_key as keyof typeof licenseToMakerWorldMap] || 'Standard Digital File License';

  // Get category ID
  const categoryInfo = makerWorldCategories[design.makerworld_category as keyof typeof makerWorldCategories];
  const categoryId = categoryInfo?.id || null;

  // Build draft data using the schema to ensure all defaults are applied
  // - For new drafts: id=0, designId=0, parentId=0
  // - For updating existing draft: id=draftId, designId=0, parentId=0
  // - For updating published design: id=0, designId=existingDesignId, parentId=existingDesignId
  const existingDesignIdNum = isPublished && existingDesignId ? Number(existingDesignId) : 0;
  const draftData = UpdateDraftRequestSchema.parse({
    id: (!isPublished && existingDraftId) ? Number(existingDraftId) : 0,
    designId: existingDesignIdNum,
    parentId: existingDesignIdNum,
    title: design.main_name,
    summary: design.description || '',
    categoryId,
    tags: design.tags ? design.tags.map(t => t.tag) : [],
    license: mwLicense,
    nsfw: false,
    modelSource: 'original',
    cover: uploadedAssets.images[0]?.url || '',
    designPictures: uploadedAssets.images.map(img => ({ name: img.name, url: img.url })),
    modelFiles: uploadedAssets.models.map(model => ({
      modelName: model.name,
      modelUrl: model.url,
      modelSize: model.size,
      modelType: model.name.split('.').pop() || '',
      isAutoGenerated: false,
      unikey: '',
      thumbnailName: '',
      thumbnailSize: 0,
      thumbnailUrl: '',
      modelUpdateTime: '',
    })),
  });

  let result: { id: number; designId: number };

  if (isPublished) {
    // For published designs: create a new draft linked to the existing published design
    // This new draft will replace the published version when published
    log.info(`[MakerWorld] Creating new draft for published design (designId: ${existingDesignId})`);
    const createResult = await api.createDraft(draftData) as { id: number; designId: number };
    log.info(`[MakerWorld] Draft created for published design:`, createResult);
    result = createResult;
  } else if (existingDraftId) {
    // Update existing draft
    log.info(`[MakerWorld] Updating existing draft (draftId: ${existingDraftId})`);
    await api.updateDraft(existingDraftId, draftData);
    const draft = await api.getDraftById(existingDraftId);
    log.info(`[MakerWorld] Draft updated:`, { id: draft.id, designId: draft.designId, status: `${draft.status} (${getMakerWorldStatusName(draft.status)})` });
    result = { id: draft.id, designId: draft.designId };
  } else {
    // Create new draft
    log.info(`[MakerWorld] Creating new draft`);
    const createResult = await api.createDraft(draftData) as { id: number; designId: number };
    log.info(`[MakerWorld] New draft created:`, createResult);
    result = createResult;
  }

  log.info(`[MakerWorld] publishToMakerWorld complete: draftId=${result.id}, designId=${result.designId}`);
  return { draftId: result.id, designId: result.designId };
}

// Record the MakerWorld status in the local database
async function recordMakerWorldStatus(designId: string, platformDesignId: string | number, status: string) {
  log.info(`[MakerWorld] Recording status: designId=${designId}, platformDesignId=${platformDesignId}, status=${status}`);
  const response = await fetch('/api/makerworld/model/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ designId, platformDesignId, status }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    log.error(`[MakerWorld] Failed to record status:`, errorData);
    throw new Error(errorData.error || 'Failed to record MakerWorld status');
  }
  log.info(`[MakerWorld] Status recorded successfully`);
}

export function MakerWorldPublishing(props: PlatformPublishingProps) {
  const { isAuthenticated, accessToken, user } = useMakerWorldAuth();

  return (
    <Fragment>
    <PlatformPublishing
      {...props}
      platformName="MakerWorld"
      platformKey="MAKERWORLD"
      isAuthenticated={isAuthenticated}
      accessToken={accessToken}
      getPlatformStatus={(design) => {
        const mwPlatform = design.platforms.find(p => p.platform === "MAKERWORLD");
        if (!mwPlatform) return { status: 'not_published' };
        return {
          status: mwPlatform.published_status === 2 ? 'published' :
                  mwPlatform.published_status === 1 ? 'draft' :
                  'not_published',
          id: mwPlatform.platform_design_id,
          url: mwPlatform.published_status === 2
            ? `https://makerworld.com/en/models/${mwPlatform.platform_design_id}` :
            mwPlatform.published_status === 1
            ? `https://makerworld.com/en/my/models/drafts/${mwPlatform.platform_design_id}/edit` :
            undefined,
        };
      }}
      isValidForPlatform={(design, setErrorMessage) => {
        if (!design.main_name || design.main_name.trim() === "") {
          setErrorMessage("The design must have a name before publishing to MakerWorld.");
          return false;
        }
        if (!design.assets || design.assets.length === 0) {
          setErrorMessage("You need to add at least one file before publishing to MakerWorld");
          return false;
        }
        const hasImages = design.assets.some(asset =>
          makerWorldImageFileTypes.includes(asset.file_ext.toLowerCase())
        );
        if (!hasImages) {
          setErrorMessage("You need to add at least one image before publishing to MakerWorld");
          return false;
        }
        if (!isPubmanLicenseSupported(design.license_key)) {
          setErrorMessage("The selected license is not supported for MakerWorld.");
          return false;
        }
        if (!design.makerworld_category) {
          setErrorMessage("A MakerWorld category must be selected.");
          return false;
        }
        return true;
      }}
      publishDraft={async ({ design, designID, accessToken }) => {
        const startTime = Date.now();
        log.info(`[MakerWorld] === publishDraft START === designID=${designID}, designName="${design.main_name}"`);
        if (!user) throw new Error('Not authenticated to MakerWorld');

        const api = new MakerWorldClientAPI();
        const { draftId } = await publishToMakerWorld(api, design, user);

        // Record in local database
        await recordMakerWorldStatus(designID, draftId, 'draft');

        const elapsed = Date.now() - startTime;
        log.info(`[MakerWorld] === publishDraft COMPLETE === draftId=${draftId} (${elapsed}ms)`);
        return {
          id: String(draftId),
          url: `https://makerworld.com/en/my/models/drafts/${draftId}/edit`,
        };
      }}
      updateModel={async ({ design, designID, accessToken, platformId, platformStatus }) => {
        const startTime = Date.now();
        log.info(`[MakerWorld] === updateModel START === designID=${designID}, platformId=${platformId}, platformStatus=${platformStatus}`);
        if (!user) throw new Error('Not authenticated to MakerWorld');

        const api = new MakerWorldClientAPI();

        // For published designs (synced from MakerWorld), platformId is the design ID, not a draft ID
        // We can skip the draft check and go straight to updating
        let actualDesignId: number | undefined;
        let isActuallyPublished = false;
        let draftStatus: number | undefined;

        if (platformStatus === 'published') {
          // platformId is the design ID for published designs
          actualDesignId = parseInt(platformId, 10);
          isActuallyPublished = true;
          log.info(`[MakerWorld] Design already published (designId=${actualDesignId}), skipping draft check`);
        } else {
          // For drafts, check actual status on MakerWorld - the local status might be stale
          // (e.g., design was "published" but is still pending review with designId=0)
          log.info(`[MakerWorld] Fetching current draft/design status from MakerWorld...`);
          const currentDraft = await api.getDraftById(platformId);
          actualDesignId = currentDraft.designId;
          draftStatus = currentDraft.status;
          isActuallyPublished = !!(actualDesignId && actualDesignId > 0);
          log.info(`[MakerWorld] Current status: designId=${actualDesignId}, status=${draftStatus} (${getMakerWorldStatusName(draftStatus)}), isActuallyPublished=${isActuallyPublished}`);
        }

        if (isActuallyPublished && actualDesignId) {
          // For truly published designs: create new draft linked to the design, publish it
          log.info(`[MakerWorld] Updating published design (designId: ${actualDesignId})...`);
          const { draftId } = await publishToMakerWorld(api, design, user, {
            existingDesignId: actualDesignId,
            isPublished: true,
          });

          // Publish the new draft to update the published design
          log.info(`[MakerWorld] Submitting draft ${draftId} to update published design...`);
          await api.publishDraft(draftId);

          // Record in local database with the actual design ID
          await recordMakerWorldStatus(designID, actualDesignId, 'published');

          const elapsed = Date.now() - startTime;
          log.info(`[MakerWorld] === updateModel COMPLETE === published design updated (${elapsed}ms)`);
          return {
            status: 'published',
            id: String(actualDesignId),
            url: `https://makerworld.com/en/models/${actualDesignId}`,
          };
        } else {
          // For drafts (including pending review): update the existing draft
          log.info(`[MakerWorld] Updating draft (not yet published, status=${draftStatus !== undefined ? getMakerWorldStatusName(draftStatus) : 'unknown'})...`);
          await publishToMakerWorld(api, design, user, { existingDraftId: platformId });

          // Record in local database
          await recordMakerWorldStatus(designID, platformId, 'draft');

          const elapsed = Date.now() - startTime;
          log.info(`[MakerWorld] === updateModel COMPLETE === draft updated (${elapsed}ms)`);
          return {
            status: 'draft',
            id: platformId,
            url: `https://makerworld.com/en/my/models/drafts/${platformId}/edit`,
          };
        }
      }}
      publishPublic={async ({ design, designID, accessToken, platformId }) => {
        const startTime = Date.now();
        log.info(`[MakerWorld] === publishPublic START === designID=${designID}, platformId=${platformId}`);
        if (!user) throw new Error('Not authenticated to MakerWorld');
        if (!design) throw new Error('Design data is required');

        const api = new MakerWorldClientAPI();

        // First update the draft with latest data
        log.info(`[MakerWorld] Updating draft before publishing...`);
        await publishToMakerWorld(api, design, user, { existingDraftId: platformId });

        // Then submit for public publishing
        log.info(`[MakerWorld] Submitting draft ${platformId} for public publishing...`);
        await api.publishDraft(platformId);

        // Get the draft to check its status after submission
        log.info(`[MakerWorld] Fetching draft status after submission...`);
        const draft = await api.getDraftById(platformId);
        const statusName = getMakerWorldStatusName(draft.status);
        log.info(`[MakerWorld] Draft after publish:`, {
          id: draft.id,
          designId: draft.designId,
          status: `${draft.status} (${statusName})`,
          title: draft.title,
        });

        // If designId is assigned, the design is fully published
        // If designId is 0, it's pending review (status 6 or 10) - use draft id as identifier
        const publishedDesignId = (draft.designId && draft.designId > 0) ? draft.designId : draft.id;
        const isFullyPublished = draft.designId && draft.designId > 0;

        log.info(`[MakerWorld] Publish result: isFullyPublished=${isFullyPublished}, publishedDesignId=${publishedDesignId}, status=${statusName}`);

        // Record in local database
        await recordMakerWorldStatus(designID, publishedDesignId, isFullyPublished ? 'published' : 'draft');

        const elapsed = Date.now() - startTime;
        log.info(`[MakerWorld] === publishPublic COMPLETE === ${isFullyPublished ? 'published' : `submitted (${statusName})`}: ${publishedDesignId} (${elapsed}ms)`);

        // Return appropriate URL based on publish status
        return {
          id: String(publishedDesignId),
          url: isFullyPublished
            ? `https://makerworld.com/en/models/${publishedDesignId}`
            : `https://makerworld.com/en/my/models/drafts/${publishedDesignId}/edit`,
        };
      }}
    />
    <MakerWorldPrintProfiles design={props.design} designID={props.designID} onDesignUpdated={props.onDesignUpdated} />
    </Fragment>
  );
}

// Create a MakerWorld "print profile" (their term - shows as "Print Profile" on the design
// page) for a specific .3mf, as its own deliberate, user-confirmed action rather than an
// automatic side effect of publishing. MakerWorld requires a real printed photo per profile
// and discourages splitting one model into many profiles (see their upload guidelines), so this
// is scoped to one asset at a time with a required photo, not a bulk loop over every 3mf.
function MakerWorldPrintProfiles({ design, designID, onDesignUpdated }: { design: PlatformPublishingProps['design']; designID: string; onDesignUpdated: (design: DesignSchema) => void }) {
  const { isAuthenticated, user } = useMakerWorldAuth();
  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);
  const [titleByAsset, setTitleByAsset] = useState<Record<string, string>>({});
  const [photoByAsset, setPhotoByAsset] = useState<Record<string, string>>({});
  const [errorByAsset, setErrorByAsset] = useState<Record<string, string>>({});
  const [createdAssetIds, setCreatedAssetIds] = useState<Set<string>>(new Set());

  const mwPlatform = design.platforms.find(p => p.platform === "MAKERWORLD");
  const threeMfAssets = design.assets.filter(a => a.file_ext.toLowerCase() === "3mf");
  const imageAssets = design.assets.filter(a => makerWorldImageFileTypes.includes(a.file_ext.toLowerCase()));

  // Only confirmed to work against a published design (parentId = the published MakerWorld
  // design id) - that's the only case this was captured and verified against.
  if (!isAuthenticated || !user) return null;
  if (!mwPlatform?.platform_design_id || mwPlatform.published_status !== 2) return null;
  if (threeMfAssets.length === 0) return null;

  const handleCreate = async (asset: PlatformPublishingProps['design']['assets'][number]) => {
    const title = (titleByAsset[asset.id] || asset.file_name.replace(/\.3mf$/i, "")).trim();
    const photo = imageAssets.find(img => img.id === photoByAsset[asset.id]);
    if (!title || !photo) return;

    setBusyAssetId(asset.id);
    setErrorByAsset(prev => ({ ...prev, [asset.id]: "" }));
    try {
      const api = new MakerWorldClientAPI();
      const appDataPath = await getAppDataPath();

      log.info(`[MakerWorld] Uploading print profile model + photo for ${asset.file_name}`);
      const modelUpload = await uploadAsset(api, asset, user.uid, appDataPath);
      const photoUpload = await uploadAsset(api, photo, user.uid, appDataPath);

      const profile = asset.print_profile;
      const printerModel = profile?.printer_model || "";
      const knownPrinter = makerWorldPrinterDevModels[printerModel as keyof typeof makerWorldPrinterDevModels];

      const payload = AddPrintProfileRequestSchema.parse({
        parentId: Number(mwPlatform.platform_design_id),
        title,
        profileTitle: title,
        profileCover: photoUpload.url,
        auxiliaryPictures: [{ name: photo.file_name, url: photoUpload.url }],
        model3Mf: { name: asset.file_name, url: modelUpload.url, size: modelUpload.size },
        printer: {
          model: printerModel,
          variant: profile?.nozzle_diameter || 0,
          settingsId: profile?.printer_settings_name || "",
        },
        compatibility: knownPrinter
          ? { ...knownPrinter, nozzleDiameter: profile?.nozzle_diameter || 0 }
          : undefined,
        projectSettings: {
          layerHeight: profile?.layer_height != null ? String(profile.layer_height) : "",
          wallLoops: profile?.wall_loops != null ? String(profile.wall_loops) : "",
          sparseInfillDensity: profile?.infill_density != null ? `${profile.infill_density}%` : "",
        },
      });

      log.info(`[MakerWorld] Creating print profile "${title}" for ${asset.file_name}:`, payload);
      const result = await api.createDraft(payload) as { id?: number };
      log.info(`[MakerWorld] Print profile create response for ${asset.file_name}:`, result);

      if (result?.id) {
        // Creating the draft only saves it - it has to be submitted separately to actually publish.
        log.info(`[MakerWorld] Submitting print profile draft ${result.id} for ${asset.file_name}`);
        await api.publishDraft(result.id);

        await fetch(`/api/design/${designID}/asset/${asset.id}/print-profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ makerworld_profile_id: String(result.id) }),
        });
        setCreatedAssetIds(prev => new Set(prev).add(asset.id));
        const updatedDesign = await fetchDesign(designID);
        onDesignUpdated(updatedDesign);
      } else {
        setErrorByAsset(prev => ({ ...prev, [asset.id]: "MakerWorld didn't return a profile id - check the log before retrying." }));
      }
    } catch (error) {
      log.error(`[MakerWorld] Failed to create print profile for ${asset.file_name}:`, error);
      setErrorByAsset(prev => ({ ...prev, [asset.id]: error instanceof Error ? error.message : "Failed to create print profile" }));
    } finally {
      setBusyAssetId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-xl font-bold mb-1">MakerWorld Print Profiles</h2>
      <p className="text-xs text-gray-500 mb-3">
        MakerWorld requires a real printed photo for each profile - pick one per file and confirm to submit it.
      </p>
      <div className="space-y-3">
        {threeMfAssets.map((asset) => {
          const isCreated = !!asset.print_profile?.makerworld_profile_id || createdAssetIds.has(asset.id);
          if (isCreated) {
            return (
              <div key={asset.id} className="text-sm text-green-700 flex items-center gap-2">
                <span>✓</span><span>{asset.file_name} — profile created</span>
              </div>
            );
          }

          const printerModel = asset.print_profile?.printer_model;
          const knownPrinter = printerModel ? makerWorldPrinterDevModels[printerModel as keyof typeof makerWorldPrinterDevModels] : undefined;
          const isBusy = busyAssetId === asset.id;

          return (
            <div key={asset.id} className="border border-gray-200 rounded p-3 space-y-2">
              <div className="text-sm font-medium">{asset.file_name}</div>
              {printerModel && !knownPrinter && (
                <div className="text-xs text-yellow-600">
                  Printer &quot;{printerModel}&quot; isn&apos;t mapped to a MakerWorld printer code yet - submitting without a specific printer tag.
                </div>
              )}
              <input
                type="text"
                placeholder="Profile title (e.g. Metal Frets)"
                value={titleByAsset[asset.id] ?? ""}
                onChange={(e) => setTitleByAsset(prev => ({ ...prev, [asset.id]: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <select
                value={photoByAsset[asset.id] ?? ""}
                onChange={(e) => setPhotoByAsset(prev => ({ ...prev, [asset.id]: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="">Select a printed photo (required)…</option>
                {imageAssets.map((img) => (
                  <option key={img.id} value={img.id}>{img.file_name}</option>
                ))}
              </select>
              {errorByAsset[asset.id] && <div className="text-xs text-red-600">{errorByAsset[asset.id]}</div>}
              <Button
                size="sm"
                disabled={!photoByAsset[asset.id] || isBusy}
                onClick={() => handleCreate(asset)}
              >
                {isBusy ? "Creating…" : "Create Print Profile"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
