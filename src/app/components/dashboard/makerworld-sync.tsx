"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { useMakerWorldAuth } from "../../contexts/MakerWorldAuthContext";
import {
  MakerWorldClientAPI,
  MakerWorldClientAPIError,
  DraftSummarySchema,
} from "../../lib/makerworld-client";
import { z } from "zod";
import log from "electron-log/renderer";
import { RefreshCw, Check, X, Download, AlertCircle, ExternalLink } from "lucide-react";

type DraftSummary = z.infer<typeof DraftSummarySchema>;

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

interface SyncState {
  isOpen: boolean;
  isFetching: boolean;
  isSyncing: boolean;
  designs: DraftSummary[];
  syncedDesigns: SyncedDesign[];
  selectedIds: Set<number>;
  progress: { current: number; total: number; currentName: string };
  error: string | null;
  completed: string[];
  failed: Array<{ id: number; name: string; error: string }>;
  captcha: CaptchaState | null;
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
    isOpen: false,
    isFetching: false,
    isSyncing: false,
    designs: [],
    syncedDesigns: [],
    selectedIds: new Set(),
    progress: { current: 0, total: 0, currentName: "" },
    error: null,
    completed: [],
    failed: [],
    captcha: null,
  });

  const fetchDesigns = useCallback(async (userHandle: string, userId?: number) => {
    setState((prev) => ({ ...prev, isFetching: true, error: null }));

    try {
      // Fetch already synced designs from PubMan
      const syncStatusRes = await fetch("/api/makerworld/sync");
      let syncedDesigns: SyncedDesign[] = [];

      if (syncStatusRes.ok) {
        const syncStatus = await syncStatusRes.json();
        syncedDesigns = syncStatus.syncedDesigns || [];
      } else {
        // Log but continue - we can still sync even if we can't check existing
        const errorText = await syncStatusRes.text();
        log.warn("[MakerWorld Sync] Failed to fetch sync status:", syncStatusRes.status, errorText);
      }

      // Fetch published designs from MakerWorld using the user's handle and UID
      const api = new MakerWorldClientAPI();
      const designs = await api.getMyPublishedDesigns(userHandle, userId);

      // Pre-select designs that haven't been synced yet
      const syncedIds = new Set(syncedDesigns.map((d) => d.platformDesignId));
      const newDesignIds = new Set(
        designs
          .filter((d) => !syncedIds.has(d.designId.toString()) && !syncedIds.has(d.id.toString()))
          .map((d) => d.id)
      );

      setState((prev) => ({
        ...prev,
        isFetching: false,
        designs,
        syncedDesigns,
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

  // Fetch designs when dialog opens
  useEffect(() => {
    if (isOpen && isAuthenticated && user?.handle) {
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

  const isAlreadySynced = (design: DraftSummary) => {
    return state.syncedDesigns.some(
      (s) =>
        s.platformDesignId === design.designId.toString() ||
        s.platformDesignId === design.id.toString()
    );
  };

  const syncDesigns = async () => {
    if (state.selectedIds.size === 0) return;

    setState((prev) => ({
      ...prev,
      isSyncing: true,
      progress: { current: 0, total: prev.selectedIds.size, currentName: "" },
      completed: [],
      failed: [],
      error: null,
    }));

    const designsToSync = state.designs.filter((d) => state.selectedIds.has(d.id));
    let current = 0;

    for (const design of designsToSync) {
      current++;
      setState((prev) => ({
        ...prev,
        progress: { current, total: designsToSync.length, currentName: design.title },
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

        // Extract description from details (HTML content) or use summary
        // MakerWorld stores rich description in 'details' field as HTML
        const description = designDetails?.details || design.summary || '';

        // Build design data with full details
        const designData = {
          id: design.id,
          designId: design.designId || design.id,
          title: designDetails?.title || design.title || `Design ${design.id}`,
          summary: designDetails?.summary || design.summary || '',
          categoryId: designDetails?.categoryId || design.categoryId || 0,
          tags: designDetails?.tags || design.tags || [],
          license: designDetails?.license || design.license || 'BY',
          cover: designDetails?.cover || design.cover || '',
          createTime: design.createTime || '',
          updateTime: design.updateTime || '',
        };

        log.info(`[MakerWorld Sync] Design data:`, JSON.stringify(designData));
        log.info(`[MakerWorld Sync] License from MakerWorld: ${designData.license}`);

        // Download files (model files and images)
        const assets: Array<{ fileName: string; fileExt: string; filePath: string; fileSize?: number }> = [];
        let downloadsFailed = false;
        let captchaRequired = false;

        // 1. Download cover image
        if (designData.cover) {
          log.info(`[MakerWorld Sync] Downloading cover image: ${designData.cover}`);
          const coverResult = await downloadFile(designData.cover, designData.designId.toString(), 'cover.jpg', 'image');
          if (coverResult.success && coverResult.files) {
            assets.push(...coverResult.files);
          } else if (coverResult.requiresCaptcha) {
            captchaRequired = true;
          } else {
            log.warn(`[MakerWorld Sync] Failed to download cover image: ${coverResult.error}`);
            downloadsFailed = true;
          }
        }

        // If captcha required, pause and prompt user
        if (captchaRequired) {
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
          throw new Error("Captcha required - please complete the captcha in your browser and retry");
        }

        // 2. Download model files (all.zip containing STL/3MF files)
        try {
          log.info(`[MakerWorld Sync] Fetching model download URL for design ${design.id}`);
          const modelDownload = await api.getModelDownloadUrl(design.id);
          if (modelDownload.url) {
            const fileName = modelDownload.name || 'model_files.zip';
            log.info(`[MakerWorld Sync] Downloading model files: ${fileName}`);
            const modelResult = await downloadFile(modelDownload.url, designData.designId.toString(), fileName, 'model');
            if (modelResult.success && modelResult.files) {
              assets.push(...modelResult.files);
              log.info(`[MakerWorld Sync] Added ${modelResult.files.length} model files`);
            } else if (modelResult.requiresCaptcha) {
              captchaRequired = true;
            } else {
              log.warn(`[MakerWorld Sync] Failed to download model files: ${modelResult.error}`);
              downloadsFailed = true;
            }
          }
        } catch (modelError) {
          // Check if this is a 418 captcha error from the API
          if (isCaptchaError(modelError)) {
            log.warn(`[MakerWorld Sync] Captcha required for model download URL`);
            captchaRequired = true;
          } else {
            log.warn(`[MakerWorld Sync] Failed to fetch model download URL:`, modelError);
            downloadsFailed = true;
          }
        }

        // If captcha required, pause and prompt user
        if (captchaRequired) {
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
          throw new Error("Captcha required - please complete the captcha in your browser and retry");
        }

        // 3. Download instance (print profile) 3MF files
        const instances = designDetails?.instances || [];
        for (const instance of instances) {
          if (instance.id) {
            try {
              log.info(`[MakerWorld Sync] Fetching instance ${instance.id} 3MF download URL`);
              const instanceDownload = await api.getInstanceDownloadUrl(instance.id);
              if (instanceDownload.url) {
                const fileName = instanceDownload.name || `profile_${instance.id}.3mf`;
                log.info(`[MakerWorld Sync] Downloading instance 3MF: ${fileName}`);
                const instanceResult = await downloadFile(instanceDownload.url, designData.designId.toString(), fileName, 'model');
                if (instanceResult.success && instanceResult.files) {
                  assets.push(...instanceResult.files);
                } else if (instanceResult.requiresCaptcha) {
                  captchaRequired = true;
                  break;
                } else {
                  log.warn(`[MakerWorld Sync] Failed to download instance 3MF: ${instanceResult.error}`);
                  downloadsFailed = true;
                }
              }
            } catch (instanceError) {
              // Check if this is a 418 captcha error from the API
              if (isCaptchaError(instanceError)) {
                log.warn(`[MakerWorld Sync] Captcha required for instance ${instance.id} 3MF download URL`);
                captchaRequired = true;
                break;
              } else {
                log.warn(`[MakerWorld Sync] Failed to fetch instance ${instance.id} 3MF:`, instanceError);
                downloadsFailed = true;
              }
            }
          }
        }

        // If captcha required, pause and prompt user
        if (captchaRequired) {
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
          throw new Error("Captcha required - please complete the captcha in your browser and retry");
        }

        // If any required downloads failed, don't mark as synced
        if (downloadsFailed) {
          throw new Error("Some file downloads failed - sync incomplete");
        }

        log.info(`[MakerWorld Sync] Downloaded ${assets.length} assets`);

        // Sync to PubMan
        log.info(`[MakerWorld Sync] Sending sync request to API`);
        const response = await fetch("/api/makerworld/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            design: designData,
            assets,
            description, // Pass the full description/details
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

        setState((prev) => ({
          ...prev,
          completed: [...prev.completed, design.title],
        }));
        log.info(`[MakerWorld Sync] Successfully synced ${design.title}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        log.error(`[MakerWorld Sync] Failed to sync ${design.title}:`, error);
        setState((prev) => ({
          ...prev,
          failed: [...prev.failed, { id: design.id, name: design.title, error: errorMessage }],
        }));
      }
    }

    setState((prev) => ({ ...prev, isSyncing: false }));

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

      // Handle zip files that were extracted into multiple files
      if (data.isZip && data.extractedFiles) {
        log.info(`[MakerWorld Sync] Zip extracted into ${data.extractedFiles.length} files`);
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
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sync from MakerWorld</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
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
                  const synced = isAlreadySynced(design);
                  const selected = state.selectedIds.has(design.id);
                  const completed = state.completed.includes(design.title);
                  const failed = state.failed.find((f) => f.id === design.id);

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
                        {completed ? (
                          <span className="text-green-600 flex items-center">
                            <Check className="h-4 w-4 mr-1" /> Synced
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
                        ) : synced ? (
                          <span className="text-gray-500 text-sm">Already synced</span>
                        ) : (
                          <span className="text-blue-500 text-sm">New</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Captcha Required Alert */}
              {state.captcha && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
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

              {/* Progress */}
              {state.isSyncing && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    <span>
                      Syncing {state.progress.current} of {state.progress.total}...
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {state.progress.currentName}
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{
                        width: `${(state.progress.current / state.progress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Results */}
              {!state.isSyncing && (state.completed.length > 0 || state.failed.length > 0) && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  {state.completed.length > 0 && (
                    <div className="text-green-600 mb-2">
                      <Check className="h-4 w-4 inline mr-1" />
                      Successfully synced {state.completed.length} design(s)
                    </div>
                  )}
                  {state.failed.length > 0 && (
                    <div className="text-red-500">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Failed to sync {state.failed.length} design(s)
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={state.isSyncing}>
            {state.completed.length > 0 || state.failed.length > 0 ? "Close" : "Cancel"}
          </Button>
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
        </div>
      </div>
    </div>
  );
}
