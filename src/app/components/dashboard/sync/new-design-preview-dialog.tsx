"use client";

import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { DraftSummary, MWDesignDetails, normalizeDescription } from "./types";

interface NewDesignPreviewDialogProps {
  design: DraftSummary | null;
  details?: MWDesignDetails;
  isSelected: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function NewDesignPreviewDialog({
  design,
  details,
  isSelected,
  onConfirm,
  onClose,
}: NewDesignPreviewDialogProps) {
  if (!design) return null;

  const description = details?.summary ? normalizeDescription(details.summary) : design.summary || '';
  const category = details?.categoryName || '(loading...)';
  const license = details?.license || design.license || '';
  const tags = details?.tags || design.tags || [];

  // Truncate long text for display
  const truncate = (text: string, maxLen: number) =>
    text.length > maxLen ? text.substring(0, maxLen) + '...' : text;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preview: {design.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This design will be created as a new entry in PubMan.
          </p>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {/* Description */}
            <div className="border-b pb-2">
              <div className="text-sm font-medium text-gray-700">Description</div>
              <div className="text-sm text-gray-600 mt-1">
                {description ? truncate(description.replace(/<[^>]+>/g, ''), 200) : '(empty)'}
              </div>
            </div>

            {/* License */}
            <div className="border-b pb-2">
              <div className="text-sm font-medium text-gray-700">License</div>
              <div className="text-sm text-gray-600 mt-1">
                {license || '(not set)'}
              </div>
            </div>

            {/* Category */}
            <div className="border-b pb-2">
              <div className="text-sm font-medium text-gray-700">Category</div>
              <div className="text-sm text-gray-600 mt-1">
                {category || '(not set)'}
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="text-sm font-medium text-gray-700">Tags</div>
              <div className="text-sm text-gray-600 mt-1">
                {tags.length > 0 ? tags.join(', ') : '(no tags)'}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSelected}>
            {isSelected ? 'Already Selected' : 'Add to Sync'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
