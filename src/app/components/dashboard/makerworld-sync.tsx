"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useMakerWorldAuth } from "../../contexts/MakerWorldAuthContext";
import {
  MakerWorldClientAPI,
  DraftSummarySchema,
  DraftDetailResponseSchema,
} from "../../lib/makerworld-client";
import { z } from "zod";
import log from "electron-log/renderer";
import { RefreshCw, Check, X, Download, AlertCircle } from "lucide-react";

type DraftSummary = z.infer<typeof DraftSummarySchema>;
type DraftDetail = z.infer<typeof DraftDetailResponseSchema>;

interface SyncedDesign {
  platformDesignId: string;
  designId: string;
  name: string;
  lastSynced: string;
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
  const { isAuthenticated } = useMakerWorldAuth();
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
  });

  // Fetch designs when dialog opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchDesigns();
    }
  }, [isOpen, isAuthenticated]);

  const fetchDesigns = async () => {
    setState((prev) => ({ ...prev, isFetching: true, error: null }));

    try {
      // Fetch already synced designs from PubMan
      const syncStatusRes = await fetch("/api/makerworld/sync");
      const syncStatus = await syncStatusRes.json();
      const syncedDesigns: SyncedDesign[] = syncStatus.syncedDesigns || [];

      // Fetch published designs from MakerWorld
      const api = new MakerWorldClientAPI();
      const designs = await api.getMyPublishedDesigns();

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
  };

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

    const api = new MakerWorldClientAPI();
    const designsToSync = state.designs.filter((d) => state.selectedIds.has(d.id));
    let current = 0;

    for (const design of designsToSync) {
      current++;
      setState((prev) => ({
        ...prev,
        progress: { current, total: designsToSync.length, currentName: design.title },
      }));

      try {
        // Fetch full design details
        const details = await api.getDraftById(design.id);

        // Download files
        const assets = await downloadDesignFiles(details, design.id.toString());

        // Sync to PubMan
        const response = await fetch("/api/makerworld/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            design: {
              id: details.id,
              designId: details.designId,
              title: details.title,
              summary: details.summary,
              categoryId: details.categoryId,
              tags: details.tags,
              license: details.license,
              cover: details.cover,
              createTime: details.createTime,
              updateTime: details.updateTime,
            },
            assets,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Sync failed");
        }

        setState((prev) => ({
          ...prev,
          completed: [...prev.completed, design.title],
        }));
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
    await fetchDesigns();

    // Notify parent to refresh
    if (onSyncComplete) {
      onSyncComplete();
    }

    // Dispatch custom event for dashboard to refresh
    window.dispatchEvent(new CustomEvent("pubman:designs-updated"));
  };

  const downloadDesignFiles = async (
    details: DraftDetail,
    designId: string
  ): Promise<Array<{ fileName: string; fileExt: string; filePath: string }>> => {
    const assets: Array<{ fileName: string; fileExt: string; filePath: string }> = [];

    // Download model files
    if (details.modelFiles) {
      for (const file of details.modelFiles) {
        if (!file.modelUrl) continue;
        try {
          const result = await downloadFile(file.modelUrl, designId, file.modelName, "model");
          if (result) {
            assets.push(result);
          }
        } catch (error) {
          log.warn(`[MakerWorld Sync] Failed to download model file ${file.modelName}:`, error);
        }
      }
    }

    // Download design pictures
    if (details.designPictures) {
      for (const pic of details.designPictures) {
        if (!pic.url) continue;
        try {
          const result = await downloadFile(pic.url, designId, pic.name, "image");
          if (result) {
            assets.push(result);
          }
        } catch (error) {
          log.warn(`[MakerWorld Sync] Failed to download image ${pic.name}:`, error);
        }
      }
    }

    // Download cover image
    if (details.cover) {
      try {
        const coverName = "cover.jpg";
        const result = await downloadFile(details.cover, designId, coverName, "image");
        if (result) {
          assets.push(result);
        }
      } catch (error) {
        log.warn("[MakerWorld Sync] Failed to download cover image:", error);
      }
    }

    return assets;
  };

  const downloadFile = async (
    url: string,
    designId: string,
    fileName: string,
    fileType: "model" | "image"
  ): Promise<{ fileName: string; fileExt: string; filePath: string } | null> => {
    try {
      const response = await fetch("/api/makerworld/sync/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, designId, fileName, fileType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Download failed");
      }

      const data = await response.json();
      return {
        fileName: data.fileName,
        fileExt: data.fileExt,
        filePath: data.filePath,
      };
    } catch (error) {
      log.error(`[MakerWorld Sync] Download failed for ${fileName}:`, error);
      return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
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
                      <div className="ml-4 flex items-center">
                        {completed ? (
                          <span className="text-green-600 flex items-center">
                            <Check className="h-4 w-4 mr-1" /> Synced
                          </span>
                        ) : failed ? (
                          <span className="text-red-500 flex items-center" title={failed.error}>
                            <AlertCircle className="h-4 w-4 mr-1" /> Failed
                          </span>
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
