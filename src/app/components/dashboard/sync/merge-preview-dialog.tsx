"use client";

import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { DraftSummary, NameMatchInfo, MergeConfig } from "./types";

interface MergePreviewDialogProps {
  design: DraftSummary | null;
  matchInfo: NameMatchInfo | null;
  existingConfig?: MergeConfig;
  defaultAppendTags: boolean;
  onConfirm: (config: MergeConfig) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function MergePreviewDialog({
  design,
  matchInfo,
  existingConfig,
  defaultAppendTags,
  onConfirm,
  onSkip,
  onClose,
}: MergePreviewDialogProps) {
  const [config, setConfig] = useState<MergeConfig>({
    syncName: true,
    syncDescription: true,
    syncLicense: true,
    syncCategory: true,
    syncTags: true,
    appendTags: defaultAppendTags,
    syncAssets: true,
    skip: false,
  });

  // Reset config when dialog opens with new design
  useEffect(() => {
    if (existingConfig) {
      setConfig(existingConfig);
    } else {
      setConfig({
        syncName: true,
        syncDescription: true,
        syncLicense: true,
        syncCategory: true,
        syncTags: true,
        appendTags: defaultAppendTags,
        syncAssets: true,
        skip: false,
      });
    }
  }, [design?.id, existingConfig, defaultAppendTags]);

  if (!design || !matchInfo) return null;

  const { fieldComparison } = matchInfo;

  // Truncate long text for display
  const truncate = (text: string, maxLen: number = 100) => {
    if (!text) return '(empty)';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Merge: {design.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 mb-4">
          This design exists in PubMan. Select which fields to update:
        </p>

        <div className="space-y-4">
          {/* Name */}
          <div className={`p-3 rounded-lg border ${fieldComparison.name.changed ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.syncName}
                onChange={(e) => setConfig(prev => ({ ...prev, syncName: e.target.checked }))}
                className="h-4 w-4 mt-0.5 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  Name
                  {fieldComparison.name.changed && (
                    <span className="text-xs text-amber-600 font-normal">Changed</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <div>Current: {fieldComparison.name.current || '(none)'}</div>
                  <div>New: {fieldComparison.name.new || '(none)'}</div>
                </div>
              </div>
            </label>
          </div>

          {/* Description */}
          <div className={`p-3 rounded-lg border ${fieldComparison.description.changed ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.syncDescription}
                onChange={(e) => setConfig(prev => ({ ...prev, syncDescription: e.target.checked }))}
                className="h-4 w-4 mt-0.5 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  Description
                  {fieldComparison.description.changed && (
                    <span className="text-xs text-amber-600 font-normal">Changed</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <div>Current: {truncate(fieldComparison.description.current)}</div>
                  <div>New: {truncate(fieldComparison.description.new)}</div>
                </div>
              </div>
            </label>
          </div>

          {/* License */}
          <div className={`p-3 rounded-lg border ${fieldComparison.license.changed ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.syncLicense}
                onChange={(e) => setConfig(prev => ({ ...prev, syncLicense: e.target.checked }))}
                className="h-4 w-4 mt-0.5 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  License
                  {fieldComparison.license.changed && (
                    <span className="text-xs text-amber-600 font-normal">Changed</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <div>Current: {fieldComparison.license.current || '(none)'}</div>
                  <div>New: {fieldComparison.license.new || '(none)'}</div>
                </div>
              </div>
            </label>
          </div>

          {/* Category */}
          <div className={`p-3 rounded-lg border ${fieldComparison.category.changed ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.syncCategory}
                onChange={(e) => setConfig(prev => ({ ...prev, syncCategory: e.target.checked }))}
                className="h-4 w-4 mt-0.5 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  Category
                  {fieldComparison.category.changed && (
                    <span className="text-xs text-amber-600 font-normal">Changed</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <div>Current: {fieldComparison.category.current || '(none)'}</div>
                  <div>New: {fieldComparison.category.new || '(none)'}</div>
                </div>
              </div>
            </label>
          </div>

          {/* Tags */}
          <div className={`p-3 rounded-lg border ${(fieldComparison.tags.added.length > 0 || fieldComparison.tags.removed.length > 0) ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.syncTags}
                onChange={(e) => setConfig(prev => ({ ...prev, syncTags: e.target.checked }))}
                className="h-4 w-4 mt-0.5 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  Tags
                  {(fieldComparison.tags.added.length > 0 || fieldComparison.tags.removed.length > 0) && (
                    <span className="text-xs text-amber-600 font-normal">
                      +{fieldComparison.tags.added.length} / -{fieldComparison.tags.removed.length}
                    </span>
                  )}
                </div>
                {config.syncTags && (
                  <div className="mt-2 flex gap-4">
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="tagMode"
                        checked={!config.appendTags}
                        onChange={() => setConfig(prev => ({ ...prev, appendTags: false }))}
                        className="h-3 w-3"
                      />
                      Replace all
                    </label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="tagMode"
                        checked={config.appendTags}
                        onChange={() => setConfig(prev => ({ ...prev, appendTags: true }))}
                        className="h-3 w-3"
                      />
                      Append new only
                    </label>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  <div>Current: {fieldComparison.tags.current.join(', ') || '(none)'}</div>
                  <div>New: {fieldComparison.tags.new.join(', ') || '(none)'}</div>
                </div>
              </div>
            </label>
          </div>

          {/* Assets */}
          <div className="p-3 rounded-lg border border-gray-200">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.syncAssets}
                onChange={(e) => setConfig(prev => ({ ...prev, syncAssets: e.target.checked }))}
                className="h-4 w-4 mt-0.5 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">Assets</div>
                <div className="text-xs text-gray-500 mt-1">
                  Files will be added (existing files are not replaced)
                </div>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onSkip}>
            Skip This Design
          </Button>
          <Button onClick={() => onConfirm(config)}>
            Confirm Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
