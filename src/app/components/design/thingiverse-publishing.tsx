'use client';

import { useState } from "react";
import { Button } from "@/src/app/components/ui/button";
import { DesignSchema } from "@/src/app/components/design/types";
import Link from "next/link";
import { isPubmanLicenseSupported as thingiverseIsLicenseSupported } from "@/src/app/api/thingiverse/thingiverse-lib";
import { fetchDesign } from "@/src/app/actions/design";
import {useThingiverseAuth} from "@/src/app/contexts/ThingiverseAuthContext";

interface ThingiversePublishingProps {
  design: DesignSchema;
  designID: string;
  setErrorMessage: (message: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
  onDesignUpdated: (design: DesignSchema) => void;
}

export function ThingiversePublishing({
  design,
  designID,
  setErrorMessage,
  setSuccessMessage,
  onDesignUpdated
}: ThingiversePublishingProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const { isAuthenticated, accessToken } = useThingiverseAuth();

  // Thingiverse publication status
  const [thingiverseStatus, setThingiverseStatus] = useState<{
    status: 'not_published' | 'draft' | 'published' | 'error';
    thingId?: string | null;
    url?: string;
  }>(() => {
    // Initialize from design's platforms data
    const thingiversePlatform = design.platforms.find(p => p.platform === "THINGIVERSE");
    if (!thingiversePlatform) return { status: 'not_published' };

    if (thingiversePlatform.published_status === 2) {
      return {
        status: 'published',
        thingId: thingiversePlatform.platform_design_id,
        url: `https://www.thingiverse.com/thing:${thingiversePlatform.platform_design_id}`
      };
    } else if (thingiversePlatform.published_status === 1) {
      return {
        status: 'draft',
        thingId: thingiversePlatform.platform_design_id,
        url: `https://www.thingiverse.com/thing:${thingiversePlatform.platform_design_id}`
      };
    }

    return { status: 'not_published' };
  });

  function isValidForThingiverse(design: DesignSchema) {
    // Check if we have assets - required for Thingiverse
    if (!design.assets || design.assets.length === 0) {
      setErrorMessage("You need to add at least one file before publishing to Thingiverse");
      return false;
    }

    // Check if selected license is supported
    if (!thingiverseIsLicenseSupported(design.license_key)) {
      setErrorMessage("The selected license is not supported for Thingiverse.");
      return false;
    }
    return true;
  }

  const thingiversePublishToDraft = async () => {
    if (!design || !accessToken) return;
    if (!isValidForThingiverse(design)) return;

    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/thingiverse/things', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-thingiverse-token': accessToken
        },
        body: JSON.stringify({
          designId: design.id,
          designData: design
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish to Thingiverse');
      }

      setThingiverseStatus({
        status: 'draft',
        thingId: data.thingiverseId,
        url: data.thingiverseUrl
      });

      setSuccessMessage(`Successfully published as draft to Thingiverse`);

      // Refresh design data to get updated platforms info
      const updatedDesign = await fetchDesign(designID.toString());
      onDesignUpdated(updatedDesign);

    } catch (error) {
      console.error("Failed to publish to Thingiverse:", error);
      setErrorMessage("Failed to publish to Thingiverse. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const thingiverseUpdateDraft = async () => {
    if (!design || !accessToken || !thingiverseStatus.thingId) return;
    if (!isValidForThingiverse(design)) return;

    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // First update the thing metadata
      const updateResponse = await fetch(`/api/thingiverse/${thingiverseStatus.thingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-thingiverse-token': accessToken
        },
        body: JSON.stringify({
          name: design.main_name,
          description: design.description,
          // instructions: '',
          license: design.license_key || 'cc-by-sa',
          category: design.categories && design.categories.length > 0
            ? design.categories[0].category
            : 'Other',
          tags: design.tags ? design.tags.map(tag => tag.tag) : [],
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update Thingiverse draft');
      }

      // Now re-upload files
      // We'll post to the things endpoint again but with the existing thingId
      const filesResponse = await fetch('/api/thingiverse/things', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-thingiverse-token': accessToken
        },
        body: JSON.stringify({
          designId: design.id,
          designData: design,
          thingId: thingiverseStatus.thingId
        }),
      });

      if (!filesResponse.ok) {
        const errorData = await filesResponse.json();
        throw new Error(errorData.error || 'Failed to update files on Thingiverse');
      }

      setSuccessMessage('Successfully updated Thingiverse draft');

      // Refresh design data
      const updatedDesign = await fetchDesign(designID.toString());
      onDesignUpdated(updatedDesign);
    } catch (error) {
      console.error("Failed to update Thingiverse draft:", error);
      setErrorMessage("Failed to update Thingiverse draft. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const thingiversePublishToPublic = async () => {
    if (!thingiverseStatus.thingId || !accessToken) return;

    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/thingiverse/${thingiverseStatus.thingId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-thingiverse-token': accessToken
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish to Thingiverse');
      }

      setThingiverseStatus({
        status: 'published',
        thingId: thingiverseStatus.thingId,
        url: thingiverseStatus.url
      });

      setSuccessMessage(`Successfully published to Thingiverse`);

      // Refresh design data
      const updatedDesign = await fetchDesign(designID.toString());
      onDesignUpdated(updatedDesign);

    } catch (error) {
      console.error("Failed to publish to Thingiverse:", error);
      setErrorMessage("Failed to publish to Thingiverse. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const needsSync = () => {
    if (!design || !thingiverseStatus.thingId) return false;

    // Find Thingiverse platform entry
    const thingiversePlatform = design.platforms.find(p => p.platform === "THINGIVERSE");
    if (!thingiversePlatform) return false;

    // Compare timestamps - if design was updated after the platform record was updated
    const designUpdated = new Date(design.updated_at);
    const platformUpdated = new Date(thingiversePlatform.updated_at);

    return designUpdated > platformUpdated;
  };

  return (
    <div className="mt-6 p-4 border border-gray-200 rounded-md">
      <h2 className="text-xl font-bold">Thingiverse Publishing</h2>

      {!isAuthenticated ? (
        <p>Please log in to Thingiverse to publish this design.</p>
      ) : (
        <div className="space-y-4">
          {thingiverseStatus.status === 'not_published' && (
            <Button
              onClick={thingiversePublishToDraft}
              disabled={isPublishing}
              className="w-full"
            >
              {isPublishing ? 'Publishing...' : 'Publish to Thingiverse (Draft)'}
            </Button>
          )}

          {(thingiverseStatus.status === 'draft' || thingiverseStatus.status === 'error') && (
            <>
              <div className="flex items-center justify-between">
                <span>Status: {thingiverseStatus.status.toUpperCase()}</span>
                {thingiverseStatus.url && (
                  <Link href={thingiverseStatus.url} target="_blank" className="text-blue-500 hover:underline">
                    View on Thingiverse
                  </Link>
                )}
              </div>

              {thingiverseStatus.thingId && needsSync() && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4" role="alert">
                  <span className="font-bold">Design Modified:</span> Click <i>Update Draft</i> to sync your changes with Thingiverse
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={thingiverseUpdateDraft}
                  disabled={isPublishing}
                  className="flex-1"
                  variant="outline"
                >
                  {isPublishing ? 'Updating...' : 'Update Draft'}
                </Button>

                <Button
                  onClick={thingiversePublishToPublic}
                  disabled={isPublishing}
                  className="flex-1"
                >
                  {isPublishing ? 'Publishing...' : 'Publish to Public'}
                </Button>
              </div>
            </>
          )}

          {thingiverseStatus.status === 'published' && (
            <>
              <div className="flex items-center justify-between">
                <span>Status: Published</span>
                {thingiverseStatus.url && (
                  <Link href={thingiverseStatus.url} target="_blank" className="text-blue-500 hover:underline">
                    View on Thingiverse
                  </Link>
                )}
              </div>

              {thingiverseStatus.thingId && needsSync() && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4" role="alert">
                  <span className="font-bold">Design Modified:</span> Click <i>Update Published</i> to sync your changes with Thingiverse
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={thingiverseUpdateDraft}
                  disabled={isPublishing}
                  className="flex-1"
                  variant="outline"
                >
                  {isPublishing ? 'Updating...' : 'Update Published'}
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