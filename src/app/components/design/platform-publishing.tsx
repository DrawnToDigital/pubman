'use client';

import { useState } from "react";
import { Button } from "@/src/app/components/ui/button";
import Link from "next/link";
import { fetchDesign } from "@/src/app/actions/design";
import log from "electron-log/renderer";
import { DesignSchema } from "@/src/app/components/design/types";

// Props that callers should provide
export interface PlatformPublishingProps {
  design: DesignSchema;
  designID: string;
  setErrorMessage: (message: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
  onDesignUpdated: (design: DesignSchema) => void;
}

// Internal props, including all platform-specific and implementation props
export interface PlatformPublishingInternalProps extends PlatformPublishingProps {
  platformName: string;
  platformKey: string;
  isAuthenticated: boolean;
  accessToken: string | null;
  getPlatformStatus: (design: DesignSchema) => {
    status: 'not_published' | 'draft' | 'published';
    id?: string | null;
    url?: string;
  };
  isValidForPlatform: (design: DesignSchema, setErrorMessage: (msg: string) => void) => boolean;
  publishDraft: (args: { design: DesignSchema; designID: string; accessToken: string }) => Promise<{ id: string; url: string }>;
  updateModel: (args: { design: DesignSchema; designID: string; accessToken: string; platformId: string }) => Promise<void>;
  publishPublic: (args: { design?: DesignSchema; designID: string; accessToken: string; platformId: string }) => Promise<void>;
}

export function PlatformPublishing(props: PlatformPublishingInternalProps) {
  const {
    design,
    designID,
    setErrorMessage,
    setSuccessMessage,
    onDesignUpdated,
    platformName,
    platformKey,
    isAuthenticated,
    accessToken,
    getPlatformStatus,
    isValidForPlatform,
    publishDraft,
    updateModel,
    publishPublic,
  } = props;

  const [isUpdating, setIsUpdating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [platformStatus, setPlatformStatus] = useState<{
    status: 'not_published' | 'draft' | 'published';
    id?: string | null;
    url?: string;
  }>(() => getPlatformStatus(design));

  // Helper to check if design needs sync
  const needsSync = () => {
    if (!design || !platformStatus.id) return false;
    const platformEntry = design.platforms.find(p => p.platform === platformKey);
    if (!platformEntry) return false;
    const designUpdated = new Date(design.updated_at);
    const platformUpdated = new Date(platformEntry.updated_at);
    return designUpdated > platformUpdated;
  };

  // Draft publish
  const handlePublishDraft = async () => {
    if (!design || !accessToken) return;
    if (!isValidForPlatform(design, setErrorMessage)) return;
    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await publishDraft({ design, designID, accessToken });
      setPlatformStatus({
        status: 'draft',
        id: result.id,
        url: result.url,
      });
      const updatedDesign = await fetchDesign(designID);
      onDesignUpdated(updatedDesign);
      setSuccessMessage(`Successfully created draft on ${platformName}`);
    } catch (error) {
      log.error(`Error publishing to ${platformName}:`, error);
      setErrorMessage(`Failed to publish to ${platformName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Update model
  const handleUpdateModel = async () => {
    if (!design || !accessToken || !platformStatus.id) return;
    if (!isValidForPlatform(design, setErrorMessage)) return;
    setIsUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateModel({ design, designID, accessToken, platformId: platformStatus.id });
      const updatedDesign = await fetchDesign(designID);
      onDesignUpdated(updatedDesign);
      setSuccessMessage(`Successfully updated model on ${platformName}`);
    } catch (error) {
      log.error(`Error updating ${platformName} model:`, error);
      setErrorMessage(`Failed to update ${platformName} model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Publish to public
  const handlePublishPublic = async () => {
    if (!platformStatus.id || !accessToken) return;
    if (!isValidForPlatform(design, setErrorMessage)) return;
    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await publishPublic({ design, designID, accessToken, platformId: platformStatus.id });
      setPlatformStatus({
        status: 'published',
        id: platformStatus.id,
        url: platformStatus.url,
      });
      const updatedDesign = await fetchDesign(designID);
      onDesignUpdated(updatedDesign);
      setSuccessMessage(`Successfully published to ${platformName}`);
    } catch (error) {
      log.error(`Error publishing to ${platformName}:`, error);
      setErrorMessage(`Failed to publish to ${platformName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="mt-6 p-4 border border-gray-200 rounded-md">
      <h2 className="text-xl font-bold">{platformName} Publishing</h2>
      {!isAuthenticated ? (
        <p>Please log in to {platformName} to publish this design.</p>
      ) : (
        <div className="space-y-4">
          {platformStatus.status === 'not_published' && (
            <Button
              onClick={handlePublishDraft}
              disabled={isPublishing}
              className="w-full"
            >
              {isPublishing ? 'Publishing Draft...' : `Publish Draft to ${platformName}`}
            </Button>
          )}

          {platformStatus.status === 'draft' && (
            <>
              <div className="flex items-center justify-between">
                <span>Status: Draft</span>
                {platformStatus.url && (
                  <Link
                    href={platformStatus.url}
                    target="_blank"
                    className="text-blue-500 hover:underline block mt-1"
                  >
                    View on {platformName}
                  </Link>
                )}
              </div>
              {platformStatus.id && needsSync() && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4" role="alert">
                  <span className="font-bold">Design Modified:</span> Click <i>Update Draft</i> to sync your changes
                </div>
              )}
              <div className="flex space-x-2">
                <Button
                  onClick={handleUpdateModel}
                  disabled={isUpdating || isPublishing}
                  className="flex-1"
                  variant="outline"
                >
                  {isUpdating ? "Updating Draft..." : "Update Draft"}
                </Button>
                <Button
                  onClick={handlePublishPublic}
                  disabled={isUpdating || isPublishing}
                  className="flex-1"
                >
                  {isPublishing ? "Publishing..." : "Publish to Public"}
                </Button>
              </div>
            </>
          )}

          {platformStatus.status === 'published' && (
            <>
              <div className="flex items-center justify-between">
                <span>Status: Published</span>
                {platformStatus.url && (
                  <Link
                    href={platformStatus.url}
                    target="_blank"
                    className="text-blue-500 hover:underline block mt-1"
                  >
                    View on {platformName}
                  </Link>
                )}
              </div>
              {platformStatus.id && needsSync() && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4" role="alert">
                  <span className="font-bold">Design Modified:</span> Click <i>Update Published</i> to sync your changes
                </div>
              )}
              <div className="flex space-x-2">
                <Button
                  onClick={handleUpdateModel}
                  disabled={isUpdating}
                  className="flex-1"
                  variant="outline"
                >
                  {isUpdating ? "Updating Design..." : "Update Published Design"}
                </Button>
                <Button
                  disabled={true}
                  className="flex-1"
                >
                  Already Published
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
