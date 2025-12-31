"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { useMakerWorldAuth } from "../../contexts/MakerWorldAuthContext";
import {
  MakerWorldClientAPI,
  MakerWorldClientAPIError,
  getLicenseDisplayName,
  licensesAreEqual,
} from "../../lib/makerworld-client";
import log from "electron-log/renderer";
import { RefreshCw, Check, Download, AlertCircle, ExternalLink, GitMerge, ChevronDown, Settings2 } from "lucide-react";
import {
  DraftSummary,
  PubmanDesignDetails,
  NameMatchInfo,
  MergeConfig,
  MWDesignDetails,
  normalizeDescription,
} from "./sync";
import { NewDesignPreviewDialog } from "./sync/new-design-preview-dialog";
import { MergePreviewDialog } from "./sync/merge-preview-dialog";

interface SyncedDesign {
  platformDesignId: string;
  designId: string;
  name: string;
  lastSynced: string;
}

interface CaptchaState {
  required: boolean;
  designId: number;
  makerWorldDesignId: number; // The published design ID on MakerWorld
  designName: string;
}

interface SyncOptions {
  downloadCoverImages: boolean;
  downloadModelFiles: boolean;
  appendTags: boolean;
}

// MakerWorld category from API response
interface MakerWorldCategory {
  id: number;
  name: string;
}

// Change report for detailed summary
interface FieldChange {
  field: string;
  from?: string;
  to?: string;
  action: 'added' | 'updated' | 'unchanged';
}

interface SyncResult {
  id: number;
  name: string;
  isNew: boolean;
  changes?: FieldChange[];
  assetsAdded?: number;
}

interface SyncState {
  isFetching: boolean;
  isSyncing: boolean;
  designs: DraftSummary[];
  syncedDesigns: SyncedDesign[];
  allDesignNames: Set<string>;
  designDetails: Record<string, PubmanDesignDetails>;
  selectedIds: Set<number>;
  progress: {
    designsCurrent: number;
    designsTotal: number;
    designName: string;
    filesCurrent: number;
    filesTotal: number;
    fileName: string;
  };
  error: string | null;
  completed: SyncResult[];
  failed: Array<{ id: number; name: string; error: string }>;
  skipped: Array<{ id: number; name: string; reason: string }>;
  captcha: CaptchaState | null;
  // Sync options
  syncOptions: SyncOptions;
  // Merge handling - maps MakerWorld design ID to merge config
  mergeConfigs: Map<number, MergeConfig>;
  // Cancel support
  syncCancelled: boolean;
  // Dialogs
  mergePreviewDesignId: number | null;  // MakerWorld design ID to preview (for merge)
  newDesignPreviewId: number | null;    // MakerWorld design ID to preview (for new)
  showSummary: boolean;
  // UI state
  optionsExpanded: boolean;
  expandedSummaryIds: Set<number>;  // Design IDs with expanded details in summary
  // Cache of fetched MakerWorld design details (for merge preview)
  mwDesignDetails: Map<number, MWDesignDetails>;
  isFetchingDetails: boolean;
}

export function MakerWorldSync({
  isOpen,
  onClose,
  onSyncComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}) {
  const { isAuthenticated, user } = useMakerWorldAuth();
  const [state, setState] = useState<SyncState>({
    isFetching: false,
    isSyncing: false,
    designs: [],
    syncedDesigns: [],
    allDesignNames: new Set(),
    designDetails: {},
    selectedIds: new Set(),
    progress: {
      designsCurrent: 0,
      designsTotal: 0,
      designName: "",
      filesCurrent: 0,
      filesTotal: 0,
      fileName: "",
    },
    error: null,
    completed: [],
    failed: [],
    skipped: [],
    captcha: null,
    syncOptions: {
      downloadCoverImages: true,
      downloadModelFiles: true,
      appendTags: false,
    },
    mergeConfigs: new Map(),
    syncCancelled: false,
    mergePreviewDesignId: null,
    newDesignPreviewId: null,
    showSummary: false,
    optionsExpanded: false,
    expandedSummaryIds: new Set(),
    mwDesignDetails: new Map(),
    isFetchingDetails: false,
  });

  // Ref to track cancellation (needed because state is stale in async loops)
  const cancelledRef = useRef(false);
  // Ref to track if captcha was required (to break out of sync loop)
  const captchaRequiredRef = useRef(false);

  const fetchDesigns = useCallback(async (userHandle: string, userId?: number) => {
    setState((prev) => ({ ...prev, isFetching: true, error: null }));

    try {
      // Fetch already synced designs from PubMan
      const syncStatusRes = await fetch("/api/makerworld/sync");
      let syncedDesigns: SyncedDesign[] = [];

      let allDesignNames: string[] = [];
      let designDetails: Record<string, PubmanDesignDetails> = {};
      if (syncStatusRes.ok) {
        const syncStatus = await syncStatusRes.json();
        syncedDesigns = syncStatus.syncedDesigns || [];
        allDesignNames = syncStatus.allDesignNames || [];
        designDetails = syncStatus.designDetails || {};
      } else {
        // Log but continue - we can still sync even if we can't check existing
        const errorText = await syncStatusRes.text();
        log.warn("[MakerWorld Sync] Failed to fetch sync status:", syncStatusRes.status, errorText);
      }

      // Fetch published designs from MakerWorld using the user's handle and UID
      const api = new MakerWorldClientAPI();
      const designs = await api.getMyPublishedDesigns(userHandle, userId);

      // Pre-select new designs and name matches (not previously synced designs)
      const syncedIds = new Set(syncedDesigns.map((d) => d.platformDesignId));
      const existingNames = new Set(allDesignNames);
      const newDesignIds = new Set(
        designs
          .filter((d) => {
            // Don't pre-select previously synced designs
            if (syncedIds.has(d.designId.toString()) || syncedIds.has(d.id.toString())) {
              return false;
            }
            // Pre-select new designs and name matches
            return true;
          })
          .map((d) => d.id)
      );

      setState((prev) => ({
        ...prev,
        isFetching: false,
        designs,
        syncedDesigns,
        allDesignNames: existingNames,
        designDetails,
        selectedIds: newDesignIds,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch designs";
      log.error("[MakerWorld Sync] Error fetching designs:", error);
      setState((prev) => ({
        ...prev,
        isFetching: false,
        error: errorMessage,
      }));
    }
  }, []);

  // Fetch designs when dialog opens and reset status
  useEffect(() => {
    if (isOpen && isAuthenticated && user?.handle) {
      // Reset status when modal opens
      setState((prev) => ({
        ...prev,
        completed: [],
        failed: [],
        skipped: [],
        syncCancelled: false,
        mergeConfigs: new Map(),
        showSummary: false,
        mergePreviewDesignId: null,
        newDesignPreviewId: null,
        expandedSummaryIds: new Set(),
        mwDesignDetails: new Map(),
        isFetchingDetails: false,
      }));
      fetchDesigns(user.handle, user.uid);
    }
  }, [isOpen, isAuthenticated, user?.handle, user?.uid, fetchDesigns]);

  const toggleDesign = (id: number) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { ...prev, selectedIds: newSelected };
    });
  };

  const selectAll = () => {
    setState((prev) => ({
      ...prev,
      selectedIds: new Set(prev.designs.map((d) => d.id)),
    }));
  };

  const selectNone = () => {
    setState((prev) => ({
      ...prev,
      selectedIds: new Set(),
    }));
  };

  const toggleOptionsPanel = () => {
    setState((prev) => ({
      ...prev,
      optionsExpanded: !prev.optionsExpanded,
    }));
  };

  const updateSyncOption = (key: keyof SyncOptions, value: boolean) => {
    setState((prev) => ({
      ...prev,
      syncOptions: {
        ...prev.syncOptions,
        [key]: value,
      },
    }));
  };

  const cancelSync = () => {
    cancelledRef.current = true;
    setState((prev) => ({
      ...prev,
      syncCancelled: true,
    }));
    log.info(`[MakerWorld Sync] User requested cancellation`);
  };

  const dismissCaptcha = () => {
    setState((prev) => ({
      ...prev,
      captcha: null,
    }));
  };

  const openMakerWorldForCaptcha = async () => {
    // Open MakerWorld design page in Electron window with the same session for captcha completion
    const designId = state.captcha?.makerWorldDesignId;
    if (window.electron?.makerworld?.openCaptcha) {
      try {
        const result = await window.electron.makerworld.openCaptcha(designId);
        log.info(`[MakerWorld Sync] Captcha window closed for design ${designId}, captchaCompleted: ${result.captchaCompleted}`);

        // If captcha was completed (download was attempted), auto-resume sync
        if (result.captchaCompleted) {
          log.info(`[MakerWorld Sync] Captcha completed, resuming sync...`);
          // Clear captcha state and restart sync
          setState((prev) => ({
            ...prev,
            captcha: null,
          }));
          // Small delay to allow session to be updated
          setTimeout(() => {
            syncDesigns();
          }, 500);
        }
      } catch (error) {
        log.error("[MakerWorld Sync] Failed to open captcha window:", error);
        // Fallback to external browser with design page
        const url = designId
          ? `https://makerworld.com/en/models/${designId}`
          : "https://makerworld.com";
        window.open(url, "_blank");
      }
    } else {
      // Fallback for non-Electron environment
      const url = designId
        ? `https://makerworld.com/en/models/${designId}`
        : "https://makerworld.com";
      window.open(url, "_blank");
    }
  };

  // Helper to check if an error is a 418 captcha error
  const isCaptchaError = (error: unknown): boolean => {
    if (error instanceof MakerWorldClientAPIError) {
      return error.responseStatus === 418;
    }
    return false;
  };

  // Check if design was previously synced (has platform link)
  const wasPreviouslySynced = (design: DraftSummary) => {
    return state.syncedDesigns.some(
      (s) =>
        s.platformDesignId === design.designId.toString() ||
        s.platformDesignId === design.id.toString()
    );
  };

  const hasNameMatch = (design: DraftSummary) => {
    // Check if name matches an existing design but NOT already synced via platform link
    if (wasPreviouslySynced(design)) return false;
    return state.allDesignNames.has(design.title);
  };

  // Get merge info for a design (previously synced or name match)
  const getNameMatchInfo = (design: DraftSummary): NameMatchInfo | null => {
    let pubmanDetails: PubmanDesignDetails | null = null;

    if (wasPreviouslySynced(design)) {
      // Find the synced record to get the design name
      const synced = state.syncedDesigns.find(
        (s) =>
          s.platformDesignId === design.designId.toString() ||
          s.platformDesignId === design.id.toString()
      );
      if (synced) {
        pubmanDetails = state.designDetails[synced.name] || null;
      }
    } else if (hasNameMatch(design)) {
      pubmanDetails = state.designDetails[design.title] || null;
    }

    if (!pubmanDetails) return null;

    // Use cached MakerWorld details if available, otherwise fall back to list data
    const mwDetails = state.mwDesignDetails.get(design.id);
    const rawDescription = mwDetails?.summary || design.summary || '';
    const newDescription = normalizeDescription(rawDescription);
    const newLicense = mwDetails?.license || design.license || '';
    // Use category name from cached details, or indicate it will be fetched
    const newCategory = mwDetails?.categoryName || '(fetched during sync)';
    const newTags = mwDetails?.tags || design.tags || [];

    const currentTags = pubmanDetails.tags || [];
    const addedTags = newTags.filter(t => !currentTags.includes(t));
    const removedTags = currentTags.filter(t => !newTags.includes(t));

    const newName = design.title;
    const currentName = pubmanDetails.name || '';

    return {
      makerWorldDesignId: design.id,
      pubmanDesignId: pubmanDetails.id,
      pubmanDesignName: design.title,
      pubmanDetails,
      fieldComparison: {
        name: {
          current: currentName,
          new: newName,
          changed: currentName !== newName,
        },
        description: {
          current: pubmanDetails.description || '',
          new: newDescription,
          changed: (pubmanDetails.description || '') !== newDescription,
        },
        license: {
          current: getLicenseDisplayName(pubmanDetails.license),
          new: getLicenseDisplayName(newLicense),
          changed: !licensesAreEqual(pubmanDetails.license || '', newLicense),
        },
        category: {
          current: pubmanDetails.category || '',
          new: newCategory,
          changed: (pubmanDetails.category || '') !== newCategory,
        },
        tags: {
          current: currentTags,
          new: newTags,
          added: addedTags,
          removed: removedTags,
        },
      },
    };
  };

  // Open merge preview for a design - fetches details first
  const openMergePreview = async (designId: number) => {
    // Check if we already have cached details
    if (!state.mwDesignDetails.has(designId)) {
      setState((prev) => ({ ...prev, isFetchingDetails: true }));
      try {
        const api = new MakerWorldClientAPI();
        const details = await api.getDesignDetails(designId);

        // Extract category name from categories array (API returns array of {id, name})
        // The first category is typically the most specific (leaf) category
        const detailsAny = details as Record<string, unknown>;
        const categories = detailsAny.categories as MakerWorldCategory[] | undefined;
        const categoryName = categories?.[0]?.name || '';

        setState((prev) => {
          const newCache = new Map(prev.mwDesignDetails);
          newCache.set(designId, {
            summary: details.summary || '',
            categoryName,
            license: details.license || '',
            tags: details.tags || [],
          });
          return {
            ...prev,
            mwDesignDetails: newCache,
            isFetchingDetails: false,
            mergePreviewDesignId: designId,
          };
        });
      } catch (error) {
        log.warn(`[MakerWorld Sync] Failed to fetch design details for preview:`, error);
        // Still open preview with list data
        setState((prev) => ({
          ...prev,
          isFetchingDetails: false,
          mergePreviewDesignId: designId,
        }));
      }
    } else {
      setState((prev) => ({
        ...prev,
        mergePreviewDesignId: designId,
      }));
    }
  };

  // Close merge preview
  const closeMergePreview = () => {
    setState((prev) => ({
      ...prev,
      mergePreviewDesignId: null,
    }));
  };

  // Open new design preview - fetches details first
  const openNewDesignPreview = async (designId: number) => {
    // Check if we already have cached details
    if (!state.mwDesignDetails.has(designId)) {
      setState((prev) => ({ ...prev, isFetchingDetails: true }));
      try {
        const api = new MakerWorldClientAPI();
        const details = await api.getDesignDetails(designId);

        // Extract category name from categories array
        const detailsAny = details as Record<string, unknown>;
        const categories = detailsAny.categories as MakerWorldCategory[] | undefined;
        const categoryName = categories?.[0]?.name || '';

        setState((prev) => {
          const newCache = new Map(prev.mwDesignDetails);
          newCache.set(designId, {
            summary: details.summary || '',
            categoryName,
            license: details.license || '',
            tags: details.tags || [],
          });
          return {
            ...prev,
            mwDesignDetails: newCache,
            isFetchingDetails: false,
            newDesignPreviewId: designId,
          };
        });
      } catch (error) {
        log.warn(`[MakerWorld Sync] Failed to fetch design details for preview:`, error);
        setState((prev) => ({
          ...prev,
          isFetchingDetails: false,
          newDesignPreviewId: designId,
        }));
      }
    } else {
      setState((prev) => ({
        ...prev,
        newDesignPreviewId: designId,
      }));
    }
  };

  // Close new design preview
  const closeNewDesignPreview = () => {
    setState((prev) => ({
      ...prev,
      newDesignPreviewId: null,
    }));
  };

  // Confirm new design and select it
  const confirmNewDesign = (designId: number) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedIds);
      newSelected.add(designId);
      return {
        ...prev,
        selectedIds: newSelected,
        newDesignPreviewId: null,
      };
    });
  };

  // Save merge config and close preview
  const saveMergeConfig = (designId: number, config: MergeConfig) => {
    setState((prev) => {
      const newConfigs = new Map(prev.mergeConfigs);
      newConfigs.set(designId, config);
      return {
        ...prev,
        mergeConfigs: newConfigs,
        mergePreviewDesignId: null,
      };
    });
  };

  // Skip a design (don't sync it)
  const skipDesign = (designId: number) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedIds);
      newSelected.delete(designId);
      return {
        ...prev,
        selectedIds: newSelected,
        mergePreviewDesignId: null,
      };
    });
  };

  // Get default merge config (all fields enabled)
  const getDefaultMergeConfig = (): MergeConfig => ({
    syncName: true,
    syncDescription: true,
    syncLicense: true,
    syncCategory: true,
    syncTags: true,
    appendTags: state.syncOptions.appendTags,
    syncAssets: true,
    skip: false,
  });

  const syncDesigns = async () => {
    if (state.selectedIds.size === 0) return;

    setState((prev) => ({
      ...prev,
      isSyncing: true,
      syncCancelled: false,
    }));
    cancelledRef.current = false;
    captchaRequiredRef.current = false;

    setState((prev) => ({
      ...prev,
      progress: {
        designsCurrent: 0,
        designsTotal: prev.selectedIds.size,
        designName: "",
        filesCurrent: 0,
        filesTotal: 0,
        fileName: "",
      },
      completed: [],
      failed: [],
      skipped: [],
      error: null,
    }));

    const designsToSync = state.designs.filter((d) => state.selectedIds.has(d.id));
    let current = 0;

    for (let i = 0; i < designsToSync.length; i++) {
      const design = designsToSync[i];

      // Check for cancellation
      if (cancelledRef.current) {
        log.info(`[MakerWorld Sync] Sync cancelled by user`);
        // Add remaining designs to skipped
        const remainingDesigns = designsToSync.slice(i);
        setState((prev) => ({
          ...prev,
          skipped: [
            ...prev.skipped,
            ...remainingDesigns.map((d) => ({
              id: d.id,
              name: d.title,
              reason: "Cancelled by user",
            })),
          ],
        }));
        break;
      }

      current++;
      setState((prev) => ({
        ...prev,
        progress: {
          ...prev.progress,
          designsCurrent: current,
          designsTotal: designsToSync.length,
          designName: design.title,
          filesCurrent: 0,
          filesTotal: 0,
          fileName: "",
        },
      }));

      try {
        log.info(`[MakerWorld Sync] Starting sync for design: id=${design.id}, designId=${design.designId}, title="${design.title}"`);

        // Validate design ID
        if (!design.id || design.id <= 0) {
          throw new Error(`Invalid design ID: ${design.id}. The design data from MakerWorld may have an unexpected format.`);
        }

        // Fetch full design details from MakerWorld API
        const api = new MakerWorldClientAPI();
        let designDetails;
        try {
          designDetails = await api.getDesignDetails(design.id);
          log.info(`[MakerWorld Sync] Fetched design details:`, JSON.stringify(designDetails));
        } catch (detailsError) {
          log.warn(`[MakerWorld Sync] Failed to fetch design details, using basic data:`, detailsError);
          designDetails = null;
        }

        // Extract and normalize description
        // MakerWorld calls its description field "summary" (confusingly)
        // MakerWorld has no equivalent for PubMan's "summary" field
        const rawDescription = designDetails?.summary || design.summary || '';
        const description = normalizeDescription(rawDescription);

        // Extract category ID and name from categories array (API returns array of {id, name})
        let categoryId = design.categoryId || 0;
        let categoryName = '';
        if (designDetails) {
          const detailsAny = designDetails as Record<string, unknown>;
          const categories = detailsAny.categories as MakerWorldCategory[] | undefined;
          if (categories && categories.length > 0) {
            categoryId = categories[0].id;
            categoryName = categories[0].name;
          }
        }

        // Build design data with full details
        // Note: MakerWorld doesn't have a PubMan summary equivalent, so we don't set it
        const designData = {
          id: design.id,
          designId: design.designId || design.id,
          title: designDetails?.title || design.title || `Design ${design.id}`,
          categoryId,
          tags: designDetails?.tags || design.tags || [],
          license: designDetails?.license || design.license || 'BY',
          cover: designDetails?.cover || design.cover || '',
          createTime: design.createTime || '',
          updateTime: design.updateTime || '',
        };

        log.info(`[MakerWorld Sync] Design data:`, JSON.stringify(designData));
        log.info(`[MakerWorld Sync] Category ID: ${categoryId}, License: ${designData.license}`);

        // Download files (model files and images) - based on sync options
        const assets: Array<{ fileName: string; fileExt: string; filePath: string; fileSize?: number }> = [];
        const failedDownloads: string[] = [];  // Track which files failed to download
        let captchaRequired = false;

        // Estimate total files for progress tracking
        const instances = designDetails?.instances || [];
        // Model files are in designExtension.model_files for public design details
        const designExt = (designDetails as Record<string, unknown>)?.designExtension as Record<string, unknown> | undefined;
        const modelFiles = (designExt?.model_files as unknown[]) || [];
        let estimatedFiles = 0;
        if (state.syncOptions.downloadCoverImages && designData.cover) estimatedFiles++;
        if (state.syncOptions.downloadModelFiles && modelFiles.length > 0) estimatedFiles++; // model zip (only if has model files)
        if (state.syncOptions.downloadModelFiles) estimatedFiles += instances.length; // instance 3mf files
        let filesCurrent = 0;

        // 1. Download cover image (if enabled)
        if (state.syncOptions.downloadCoverImages && designData.cover) {
          filesCurrent++;
          setState((prev) => ({
            ...prev,
            progress: {
              ...prev.progress,
              filesCurrent,
              filesTotal: estimatedFiles,
              fileName: 'cover.jpg',
            },
          }));
          log.info(`[MakerWorld Sync] Downloading cover image: ${designData.cover}`);
          const coverResult = await downloadFile(designData.cover, designData.designId.toString(), 'cover.jpg', 'image');
          if (coverResult.success && coverResult.files) {
            assets.push(...coverResult.files);
          } else if (coverResult.requiresCaptcha) {
            captchaRequired = true;
          } else {
            log.warn(`[MakerWorld Sync] Failed to download cover image: ${coverResult.error}`);
            failedDownloads.push(`cover.jpg: ${coverResult.error || 'unknown error'}`);
          }
        } else if (!state.syncOptions.downloadCoverImages) {
          log.info(`[MakerWorld Sync] Skipping cover image download (disabled in options)`);
        }

        // If captcha required, pause and prompt user - break out of sync loop
        if (captchaRequired) {
          captchaRequiredRef.current = true;
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            captcha: {
              required: true,
              designId: design.id,
              makerWorldDesignId: designData.designId,
              designName: design.title,
            },
          }));
          throw new Error("CAPTCHA_REQUIRED");
        }

        // 2. Download model files (all.zip containing STL/3MF files) - if enabled
        // Check if design has model files before attempting download (avoids expected 404)
        if (state.syncOptions.downloadModelFiles && modelFiles.length > 0) {
          try {
            filesCurrent++;
            log.info(`[MakerWorld Sync] Fetching model download URL for design ${design.id}`);
            const modelDownload = await api.getModelDownloadUrl(design.id);
            if (modelDownload && modelDownload.url) {
              const fileName = modelDownload.name || 'model_files.zip';
              setState((prev) => ({
                ...prev,
                progress: {
                  ...prev.progress,
                  filesCurrent,
                  filesTotal: estimatedFiles,
                  fileName,
                },
              }));
              log.info(`[MakerWorld Sync] Downloading model files: ${fileName}`);
              const modelResult = await downloadFile(modelDownload.url, designData.designId.toString(), fileName, 'model');
              if (modelResult.success && modelResult.files) {
                assets.push(...modelResult.files);
                log.info(`[MakerWorld Sync] Added ${modelResult.files.length} model files`);
              } else if (modelResult.requiresCaptcha) {
                captchaRequired = true;
              } else {
                log.warn(`[MakerWorld Sync] Failed to download model files: ${modelResult.error}`);
                failedDownloads.push(`model files: ${modelResult.error || 'unknown error'}`);
              }
            }
          } catch (modelError) {
            // Check if this is a 418 captcha error from the API
            if (isCaptchaError(modelError)) {
              log.warn(`[MakerWorld Sync] Captcha required for model download URL`);
              captchaRequired = true;
            } else {
              const errorMsg = modelError instanceof Error ? modelError.message : 'unknown error';
              log.warn(`[MakerWorld Sync] Failed to fetch model download URL:`, modelError);
              failedDownloads.push(`model files: ${errorMsg}`);
            }
          }
        } else if (state.syncOptions.downloadModelFiles && modelFiles.length === 0) {
          log.info(`[MakerWorld Sync] No model files in design ${design.id} - will use instance downloads`);
        } else {
          log.info(`[MakerWorld Sync] Skipping model files download (disabled in options)`);
        }

        // If captcha required, pause and prompt user - break out of sync loop
        if (captchaRequired) {
          captchaRequiredRef.current = true;
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            captcha: {
              required: true,
              designId: design.id,
              makerWorldDesignId: designData.designId,
              designName: design.title,
            },
          }));
          throw new Error("CAPTCHA_REQUIRED");
        }

        // 3. Download instance (print profile) 3MF files - if model downloads enabled
        if (state.syncOptions.downloadModelFiles) {
          for (const instance of instances) {
            if (instance.id) {
              try {
                filesCurrent++;
                log.info(`[MakerWorld Sync] Fetching instance ${instance.id} 3MF download URL`);
                const instanceDownload = await api.getInstanceDownloadUrl(instance.id);
                if (instanceDownload.url) {
                  const fileName = instanceDownload.name || `profile_${instance.id}.3mf`;
                  setState((prev) => ({
                    ...prev,
                    progress: {
                      ...prev.progress,
                      filesCurrent,
                      filesTotal: estimatedFiles,
                      fileName,
                    },
                  }));
                  log.info(`[MakerWorld Sync] Downloading instance 3MF: ${fileName}`);
                  const instanceResult = await downloadFile(instanceDownload.url, designData.designId.toString(), fileName, 'model');
                  if (instanceResult.success && instanceResult.files) {
                    assets.push(...instanceResult.files);
                  } else if (instanceResult.requiresCaptcha) {
                    captchaRequired = true;
                    break;
                  } else {
                    log.warn(`[MakerWorld Sync] Failed to download instance 3MF: ${instanceResult.error}`);
                    failedDownloads.push(`instance ${instance.id}: ${instanceResult.error || 'unknown error'}`);
                  }
                }
              } catch (instanceError) {
                // Check if this is a 418 captcha error from the API
                if (isCaptchaError(instanceError)) {
                  log.warn(`[MakerWorld Sync] Captcha required for instance ${instance.id} 3MF download URL`);
                  captchaRequired = true;
                  break;
                } else {
                  const errorMsg = instanceError instanceof Error ? instanceError.message : 'unknown error';
                  log.warn(`[MakerWorld Sync] Failed to fetch instance ${instance.id} 3MF:`, instanceError);
                  failedDownloads.push(`instance ${instance.id}: ${errorMsg}`);
                }
              }
            }
          }
        }

        // If captcha required, pause and prompt user
        if (captchaRequired) {
          captchaRequiredRef.current = true;
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            captcha: {
              required: true,
              designId: design.id,
              makerWorldDesignId: designData.designId,
              designName: design.title,
            },
          }));
          throw new Error("CAPTCHA_REQUIRED");
        }

        // If any required downloads failed, don't mark as synced
        if (failedDownloads.length > 0) {
          throw new Error(`Download failed: ${failedDownloads.join('; ')}`);
        }

        log.info(`[MakerWorld Sync] Downloaded ${assets.length} assets`);

        // Get merge config for this design (for name matches or previously synced)
        const mergeConfig = state.mergeConfigs.get(design.id) || (
          (hasNameMatch(design) || wasPreviouslySynced(design)) ? getDefaultMergeConfig() : undefined
        );

        // Sync to PubMan
        log.info(`[MakerWorld Sync] Sending sync request to API`);
        const response = await fetch("/api/makerworld/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            design: designData,
            assets,
            description,
            mergeConfig,
          }),
        });

        const responseText = await response.text();
        log.info(`[MakerWorld Sync] API response: ${response.status} ${responseText}`);

        if (!response.ok) {
          let errorMessage = "Sync failed";
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = responseText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        // Parse response to check if this was a new design or update
        let isNew = true;
        try {
          const responseData = JSON.parse(responseText);
          isNew = responseData.isNew ?? true;
        } catch {
          // Ignore parse errors, default to isNew
        }

        // Build change report for designs using actual synced data
        const changes: FieldChange[] = [];
        const syncedDescription = description;
        const syncedLicense = designData.license;
        const syncedTags = designData.tags;

        if (isNew) {
          // For new designs, show what was added
          if (syncedDescription) {
            const truncated = syncedDescription.substring(0, 50) + (syncedDescription.length > 50 ? '...' : '');
            changes.push({ field: 'Description', to: truncated, action: 'added' });
          }
          if (syncedLicense) {
            changes.push({ field: 'License', to: getLicenseDisplayName(syncedLicense), action: 'added' });
          }
          if (categoryName) {
            changes.push({ field: 'Category', to: categoryName, action: 'added' });
          }
          if (syncedTags.length > 0) {
            changes.push({ field: 'Tags', to: `${syncedTags.length} tags`, action: 'added' });
          }
        } else if (mergeConfig) {
          // For updated designs, show what changed by comparing with PubMan data
          const nameMatchInfo = getNameMatchInfo(design);
          if (nameMatchInfo) {
            const pubman = nameMatchInfo.pubmanDetails;
            const syncedName = designData.title;

            // Compare name
            if (mergeConfig.syncName) {
              const currentName = pubman.name || '';
              if (currentName && currentName !== syncedName) {
                changes.push({
                  field: 'Name',
                  from: currentName,
                  to: syncedName,
                  action: 'updated',
                });
              }
            }

            // Compare description
            if (mergeConfig.syncDescription) {
              const currentDesc = pubman.description || '';
              if (currentDesc !== syncedDescription) {
                changes.push({
                  field: 'Description',
                  from: currentDesc.substring(0, 50) + (currentDesc.length > 50 ? '...' : ''),
                  to: syncedDescription.substring(0, 50) + (syncedDescription.length > 50 ? '...' : ''),
                  action: 'updated',
                });
              }
            }

            // Compare license
            if (mergeConfig.syncLicense) {
              const currentLicense = pubman.license || '';
              if (!licensesAreEqual(currentLicense, syncedLicense)) {
                changes.push({
                  field: 'License',
                  from: getLicenseDisplayName(currentLicense),
                  to: getLicenseDisplayName(syncedLicense),
                  action: 'updated',
                });
              }
            }

            // Compare category
            if (mergeConfig.syncCategory && categoryName) {
              const currentCategory = pubman.category || '';
              if (currentCategory !== categoryName) {
                changes.push({
                  field: 'Category',
                  from: currentCategory || '(none)',
                  to: categoryName,
                  action: 'updated',
                });
              }
            }

            // Compare tags
            if (mergeConfig.syncTags) {
              const currentTags = pubman.tags || [];
              const addedTags = syncedTags.filter(t => !currentTags.includes(t));
              const removedTags = currentTags.filter(t => !syncedTags.includes(t));
              if (addedTags.length > 0 || removedTags.length > 0) {
                if (mergeConfig.appendTags) {
                  changes.push({
                    field: 'Tags',
                    to: `+${addedTags.length} added`,
                    action: 'updated',
                  });
                } else {
                  const parts = [];
                  if (addedTags.length > 0) parts.push(`+${addedTags.length} added`);
                  if (removedTags.length > 0) parts.push(`-${removedTags.length} removed`);
                  changes.push({
                    field: 'Tags',
                    to: parts.join(', '),
                    action: 'updated',
                  });
                }
              }
            }
          }
        }

        const assetsAdded = mergeConfig?.syncAssets !== false ? assets.length : 0;

        setState((prev) => ({
          ...prev,
          completed: [...prev.completed, {
            id: design.id,
            name: design.title,
            isNew,
            changes: changes.length > 0 ? changes : undefined,
            assetsAdded: assetsAdded > 0 ? assetsAdded : undefined,
          }],
        }));
        log.info(`[MakerWorld Sync] Successfully synced ${design.title} (${isNew ? 'new' : 'updated'})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Check if this was a captcha error - if so, skip remaining designs and break
        if (captchaRequiredRef.current || errorMessage === "CAPTCHA_REQUIRED") {
          log.info(`[MakerWorld Sync] Captcha required - pausing sync`);
          // Add remaining designs (including current) to skipped
          const remainingDesigns = designsToSync.slice(i);
          setState((prev) => ({
            ...prev,
            skipped: [
              ...prev.skipped,
              ...remainingDesigns.map((d) => ({
                id: d.id,
                name: d.title,
                reason: "Captcha required - sync paused",
              })),
            ],
          }));
          break;
        }

        log.error(`[MakerWorld Sync] Failed to sync ${design.title}:`, error);
        setState((prev) => ({
          ...prev,
          failed: [...prev.failed, { id: design.id, name: design.title, error: errorMessage }],
        }));
      }
    }

    // Only show summary if we didn't pause for captcha
    if (!captchaRequiredRef.current) {
      setState((prev) => ({ ...prev, isSyncing: false, showSummary: true }));
    }

    // Refresh synced designs list
    if (user?.handle) {
      await fetchDesigns(user.handle, user.uid);
    }

    // Notify parent to refresh
    if (onSyncComplete) {
      onSyncComplete();
    }

    // Dispatch custom event for dashboard to refresh
    window.dispatchEvent(new CustomEvent("pubman:designs-updated"));
  };

  const closeSummary = () => {
    setState((prev) => ({ ...prev, showSummary: false }));
  };

  // Toggle expanded details in summary for a design
  const toggleSummaryExpanded = (designId: number) => {
    setState((prev) => {
      const newExpanded = new Set(prev.expandedSummaryIds);
      if (newExpanded.has(designId)) {
        newExpanded.delete(designId);
      } else {
        newExpanded.add(designId);
      }
      return { ...prev, expandedSummaryIds: newExpanded };
    });
  };

  interface DownloadResult {
    success: boolean;
    files?: Array<{ fileName: string; fileExt: string; filePath: string; fileSize?: number }>;
    requiresCaptcha?: boolean;
    error?: string;
  }

  const downloadFile = async (
    url: string,
    designId: string,
    fileName: string,
    fileType: "model" | "image"
  ): Promise<DownloadResult> => {
    try {
      const response = await fetch("/api/makerworld/sync/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, designId, fileName, fileType }),
      });

      const data = await response.json();

      // Check for captcha requirement (418 status)
      if (response.status === 418 && data.requiresCaptcha) {
        log.warn(`[MakerWorld Sync] Captcha required for ${fileName}`);
        return { success: false, requiresCaptcha: true, error: "Captcha required" };
      }

      if (!response.ok) {
        return { success: false, error: data.error || "Download failed" };
      }

      // Handle zip/3mf files that were extracted into multiple files
      if ((data.isZip || data.is3mf) && data.extractedFiles) {
        log.info(`[MakerWorld Sync] ${data.isZip ? 'Zip' : '3MF'} extracted into ${data.extractedFiles.length} files`);
        return {
          success: true,
          files: data.extractedFiles.map((f: { fileName: string; fileExt: string; filePath: string; size: number }) => ({
            fileName: f.fileName,
            fileExt: f.fileExt,
            filePath: f.filePath,
            fileSize: f.size,
          })),
        };
      }

      // Single file download
      return {
        success: true,
        files: [{
          fileName: data.fileName,
          fileExt: data.fileExt,
          filePath: data.filePath,
          fileSize: data.size,
        }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      log.error(`[MakerWorld Sync] Download failed for ${fileName}:`, error);
      return { success: false, error: errorMessage };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col my-auto">
        {/* Header with action buttons and status */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Sync from MakerWorld</h2>
            <div className="flex items-center gap-2">
              {state.designs.length > 0 && (
                <Button
                  onClick={syncDesigns}
                  disabled={state.isSyncing || state.selectedIds.size === 0}
                >
                  {state.isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Sync {state.selectedIds.size} Design(s)
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={onClose} disabled={state.isSyncing}>
                {state.completed.length > 0 || state.failed.length > 0 ? "Close" : "Cancel"}
              </Button>
            </div>
          </div>

          {/* Progress bar - shown during sync */}
          {state.isSyncing && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
              {/* Design-level progress */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    Design {state.progress.designsCurrent} of {state.progress.designsTotal}
                  </span>
                  <span className="text-sm text-gray-600 truncate ml-2 max-w-[200px]">
                    {state.progress.designName}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${state.progress.designsTotal > 0 ? (state.progress.designsCurrent / state.progress.designsTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* File-level progress */}
              {state.progress.filesTotal > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">
                      Downloading file {state.progress.filesCurrent} of {state.progress.filesTotal}
                    </span>
                    <span className="text-xs text-gray-500 truncate ml-2 max-w-[200px]">
                      {state.progress.fileName}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{
                        width: `${(state.progress.filesCurrent / state.progress.filesTotal) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelSync}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Cancel Sync
                </Button>
              </div>
            </div>
          )}

          {/* Results summary - shown after sync */}
          {!state.isSyncing && (state.completed.length > 0 || state.failed.length > 0 || state.skipped.length > 0) && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center gap-4">
              {state.completed.length > 0 && (
                <span className="text-green-600 flex items-center text-sm">
                  <Check className="h-4 w-4 mr-1" />
                  {state.completed.length} synced
                </span>
              )}
              {state.failed.length > 0 && (
                <span className="text-red-500 flex items-center text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {state.failed.length} failed
                </span>
              )}
              {state.skipped.length > 0 && (
                <span className="text-gray-500 flex items-center text-sm">
                  {state.skipped.length} skipped
                </span>
              )}
            </div>
          )}

          {/* Captcha Required Alert - shown at top when captcha is needed */}
          {state.captcha && (
            <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-amber-800">Captcha Required</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    MakerWorld requires you to complete a captcha verification.
                    Click the button below to open the design page, then click
                    &quot;Download 3MF&quot; to trigger and complete the captcha.
                    The window will close automatically and sync will resume.
                  </p>
                  <p className="text-sm text-amber-600 mt-2">
                    Design: <strong>{state.captcha.designName}</strong>
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openMakerWorldForCaptcha}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open Design Page
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={dismissCaptcha}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {state.isFetching ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
              <span>Fetching designs from MakerWorld...</span>
            </div>
          ) : state.error ? (
            <div className="flex items-center justify-center py-12 text-red-500">
              <AlertCircle className="h-6 w-6 mr-2" />
              <span>{state.error}</span>
            </div>
          ) : state.designs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No published designs found on MakerWorld.
            </div>
          ) : (
            <>
              {/* Sync Options Panel */}
              <div className="mb-4 border rounded-lg">
                <button
                  type="button"
                  onClick={toggleOptionsPanel}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Sync Options</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform ${
                      state.optionsExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {state.optionsExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t">
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.syncOptions.downloadCoverImages}
                        onChange={(e) => updateSyncOption("downloadCoverImages", e.target.checked)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">Download cover images</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.syncOptions.downloadModelFiles}
                        onChange={(e) => updateSyncOption("downloadModelFiles", e.target.checked)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">Download model files (3MF, STL)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.syncOptions.appendTags}
                        onChange={(e) => updateSyncOption("appendTags", e.target.checked)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">Append tags (instead of replacing)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Selection controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  {state.selectedIds.size} of {state.designs.length} designs selected
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectNone}>
                    Select None
                  </Button>
                </div>
              </div>

              {/* Design list */}
              <div className="space-y-2">
                {state.designs.map((design) => {
                  const previouslySynced = wasPreviouslySynced(design);
                  const nameMatch = hasNameMatch(design);
                  const selected = state.selectedIds.has(design.id);
                  const completedResult = state.completed.find((c) => c.id === design.id);
                  const failed = state.failed.find((f) => f.id === design.id);
                  const skipped = state.skipped.find((s) => s.id === design.id);

                  return (
                    <div
                      key={design.id}
                      className={`flex items-center p-3 rounded-lg border ${
                        selected ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      } ${state.isSyncing ? "opacity-75" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleDesign(design.id)}
                        disabled={state.isSyncing}
                        className="h-4 w-4 text-blue-600 mr-3"
                      />
                      {design.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={design.cover}
                          alt=""
                          className="h-12 w-12 object-cover rounded mr-3"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{design.title}</div>
                        <div className="text-sm text-gray-500 truncate">{design.summary}</div>
                      </div>
                      <div className="ml-4 flex items-center flex-shrink-0">
                        {completedResult ? (
                          <span className="text-green-600 flex items-center">
                            <Check className="h-4 w-4 mr-1" /> {completedResult.isNew ? 'Created' : 'Updated'}
                          </span>
                        ) : failed ? (
                          <div className="text-red-500">
                            <span className="flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" /> Failed
                            </span>
                            <span className="text-xs block max-w-[200px] truncate" title={failed.error}>
                              {failed.error}
                            </span>
                          </div>
                        ) : skipped ? (
                          <span className="text-gray-500 text-sm">Skipped</span>
                        ) : previouslySynced ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMergePreview(design.id);
                            }}
                            disabled={state.isFetchingDetails}
                            className="text-gray-600 flex items-center text-sm hover:text-gray-800 hover:underline disabled:opacity-50"
                          >
                            {state.isFetchingDetails ? (
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            Synced - Review
                          </button>
                        ) : nameMatch ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMergePreview(design.id);
                            }}
                            disabled={state.isFetchingDetails}
                            className="text-amber-600 flex items-center text-sm hover:text-amber-700 hover:underline disabled:opacity-50"
                          >
                            {state.isFetchingDetails ? (
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <GitMerge className="h-4 w-4 mr-1" />
                            )}
                            Exists - Merge
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNewDesignPreview(design.id);
                            }}
                            disabled={state.isFetchingDetails}
                            className="text-blue-500 flex items-center text-sm hover:text-blue-700 hover:underline disabled:opacity-50"
                          >
                            {state.isFetchingDetails ? (
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            ) : null}
                            New - Preview
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </>
          )}
        </div>
      </div>

      {/* Success Summary Dialog */}
      <Dialog open={state.showSummary} onOpenChange={(open) => !open && closeSummary()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sync Complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Summary counts */}
            <div className="flex flex-wrap gap-4">
              {state.completed.length > 0 && (
                <div className="flex items-center text-green-600">
                  <Check className="h-5 w-5 mr-2" />
                  <span className="font-medium">{state.completed.length}</span>
                  <span className="ml-1">synced</span>
                </div>
              )}
              {state.failed.length > 0 && (
                <div className="flex items-center text-red-500">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">{state.failed.length}</span>
                  <span className="ml-1">failed</span>
                </div>
              )}
              {state.skipped.length > 0 && (
                <div className="flex items-center text-gray-500">
                  <span className="font-medium">{state.skipped.length}</span>
                  <span className="ml-1">skipped</span>
                </div>
              )}
            </div>

            {/* Synced designs list */}
            {state.completed.length > 0 && (
              <div className="border rounded-lg p-3 bg-green-50 overflow-hidden">
                <h4 className="text-sm font-medium text-green-800 mb-2">Synced</h4>
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {state.completed.map((item) => {
                    const hasDetails = item.changes?.length || item.assetsAdded;
                    const isExpanded = state.expandedSummaryIds.has(item.id);
                    return (
                      <li key={item.id} className="text-sm text-green-700">
                        <div className="flex items-start gap-1">
                          <Check className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span className="break-words min-w-0 flex-1">{item.name}</span>
                          <span className="text-xs text-green-600 flex-shrink-0 whitespace-nowrap">
                            ({item.isNew ? 'new' : 'updated'})
                          </span>
                          {hasDetails && (
                            <button
                              onClick={() => toggleSummaryExpanded(item.id)}
                              className="text-xs text-green-600 hover:text-green-800 underline flex-shrink-0 whitespace-nowrap"
                            >
                              {isExpanded ? 'Hide' : 'Details'}
                            </button>
                          )}
                        </div>
                        {hasDetails && isExpanded && (
                          <div className="ml-5 mt-1 text-xs text-green-600 border-l-2 border-green-300 pl-2 space-y-0.5">
                            {item.changes?.map((change, idx) => (
                              <div key={idx}>
                                <span className="font-medium">{change.field}:</span>{' '}
                                {change.from && change.to ? (
                                  <>{change.from} → {change.to}</>
                                ) : (
                                  change.to || 'Updated'
                                )}
                              </div>
                            ))}
                            {item.assetsAdded && item.assetsAdded > 0 && (
                              <div>
                                <span className="font-medium">Assets:</span>{' '}
                                +{item.assetsAdded} files added
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Failed designs list */}
            {state.failed.length > 0 && (
              <div className="border rounded-lg p-3 bg-red-50 overflow-hidden">
                <h4 className="text-sm font-medium text-red-800 mb-2">Failed</h4>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {state.failed.map((item) => {
                    const isExpanded = state.expandedSummaryIds.has(item.id);
                    const errorIsLong = item.error.length > 60;
                    return (
                      <li key={item.id} className="text-sm text-red-700">
                        <div className="flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span className="break-words min-w-0 flex-1">{item.name}</span>
                          {errorIsLong && (
                            <button
                              onClick={() => toggleSummaryExpanded(item.id)}
                              className="text-xs text-red-500 hover:text-red-700 underline flex-shrink-0 whitespace-nowrap"
                            >
                              {isExpanded ? 'Hide' : 'Details'}
                            </button>
                          )}
                        </div>
                        <div
                          className={`text-xs text-red-600 ml-4 ${isExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}
                          title={!isExpanded ? item.error : undefined}
                        >
                          {item.error}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Skipped designs list */}
            {state.skipped.length > 0 && (
              <div className="border rounded-lg p-3 bg-gray-50 overflow-hidden">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Skipped</h4>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {state.skipped.map((item) => (
                    <li key={item.id} className="text-sm text-gray-600 flex items-start gap-1">
                      <span className="break-words min-w-0 flex-1">{item.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">({item.reason})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={closeSummary}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Preview Dialog */}
      <MergePreviewDialog
        design={state.designs.find(d => d.id === state.mergePreviewDesignId) || null}
        matchInfo={state.mergePreviewDesignId
          ? getNameMatchInfo(state.designs.find(d => d.id === state.mergePreviewDesignId)!)
          : null}
        existingConfig={state.mergePreviewDesignId
          ? state.mergeConfigs.get(state.mergePreviewDesignId)
          : undefined}
        defaultAppendTags={state.syncOptions.appendTags}
        onConfirm={(config) => {
          if (state.mergePreviewDesignId) {
            saveMergeConfig(state.mergePreviewDesignId, config);
            // Also select the design if not already selected
            if (!state.selectedIds.has(state.mergePreviewDesignId)) {
              setState((prev) => ({
                ...prev,
                selectedIds: new Set([...prev.selectedIds, state.mergePreviewDesignId!]),
              }));
            }
          }
        }}
        onSkip={() => {
          if (state.mergePreviewDesignId) {
            skipDesign(state.mergePreviewDesignId);
          }
        }}
        onClose={closeMergePreview}
      />

      {/* New Design Preview Dialog */}
      <NewDesignPreviewDialog
        design={state.designs.find(d => d.id === state.newDesignPreviewId) || null}
        details={state.newDesignPreviewId ? state.mwDesignDetails.get(state.newDesignPreviewId) : undefined}
        isSelected={state.newDesignPreviewId ? state.selectedIds.has(state.newDesignPreviewId) : false}
        onConfirm={() => {
          if (state.newDesignPreviewId) {
            confirmNewDesign(state.newDesignPreviewId);
          }
        }}
        onClose={closeNewDesignPreview}
      />
    </div>
  );
}
