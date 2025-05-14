'use client';

import { useState } from "react";
import { Button } from "@/src/app/components/ui/button";
import { DesignSchema } from "@/src/app/components/design/types";
import Link from "next/link";
import { printablesIsLicenseSupported, printablesIsCategorySupported } from "@/src/app/api/printables/printables-lib";
import { fetchDesign } from "@/src/app/actions/design";
import { usePrintablesAuth } from "@/src/app/contexts/PrintablesAuthContext";
import log from "electron-log/renderer";

interface PrintablesPublishingProps {
  design: DesignSchema;
  designID: string;
  setErrorMessage: (message: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
  onDesignUpdated: (design: DesignSchema) => void;
}

export function PrintablesPublishing({
  design,
  designID,
  setErrorMessage,
  setSuccessMessage,
  onDesignUpdated
}: PrintablesPublishingProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const { isAuthenticated, accessToken } = usePrintablesAuth();

  // Printables publication status
  const [printablesStatus, setPrintablesStatus] = useState<{
    status: 'not_published' | 'draft' | 'published' | 'error';
    printablesId?: string | null;
    url?: string;
  }>(() => {
    // Initialize from design's platforms data
    const printablesPlatform = design.platforms.find(p => p.platform === "PRINTABLES");
    if (!printablesPlatform) return { status: 'not_published' };

    if (printablesPlatform.published_status === 2) {
      return {
        status: 'published',
        printablesId: printablesPlatform.platform_design_id,
        url: `https://www.printables.com/model/${printablesPlatform.platform_design_id}`
      };
    } else if (printablesPlatform.published_status === 1) {
      return {
        status: 'draft',
        printablesId: printablesPlatform.platform_design_id,
        url: `https://www.printables.com/model/${printablesPlatform.platform_design_id}`,
      };
    }

    return { status: 'not_published' };
  });

  function isValidForPrintables(design: DesignSchema) {
    // Check if we have assets - required for Printables
    if (!design.assets || design.assets.length === 0) {
      setErrorMessage("You need to add at least one file before publishing to Printables");
      return false;
    }

    // Check if we have a thumbnail/image - required for Printables
    const hasImages = design.assets.some(asset =>
      ["jpg", "jpeg", "png"].includes(asset.file_ext.toLowerCase())
    );
    if (!hasImages) {
      setErrorMessage("You need to add at least one image before publishing to Printables");
      return false;
    }

    // Check if selected license is supported
    if (!printablesIsLicenseSupported(design.license_key)) {
      setErrorMessage("The selected license is not supported for Printables.");
      return false;
    }

    // Check if selected category is supported
    const category = design.categories[0]?.category || "Other";
    if (!printablesIsCategorySupported(category)) {
      setErrorMessage("The selected category is not supported for Printables.");
      return false;
    }

    return true;
  }

  const printablesPublishToDraft = async () => {
    if (!design || !accessToken) return;
    if (!isValidForPrintables(design)) return;

    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/printables/model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-printables-token': accessToken
        },
        body: JSON.stringify({
          designId: designID,
          designData: design
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to publish to Printables");
      }

      const result = await response.json();
      setPrintablesStatus({
        status: 'draft',
        printablesId: result.printablesId,
        url: `https://www.printables.com/model/${result.printablesId}`,
      });

      // Refetch design to get updated platforms data
      const updatedDesign = await fetchDesign(designID);
      onDesignUpdated(updatedDesign);

      setSuccessMessage("Successfully created draft on Printables");
    } catch (error) {
      log.error("Error publishing to Printables:", error);
      setErrorMessage(`Failed to publish to Printables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const printablesUpdateModel = async () => {
    if (!design || !accessToken || !printablesStatus.printablesId) return;
    if (!isValidForPrintables(design)) return;

    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/printables/model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-printables-token': accessToken
        },
        body: JSON.stringify({
          designId: designID,
          designData: design,
          printablesId: printablesStatus.printablesId,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update Printables model");
      }

      // Refetch design to get updated platforms data
      const updatedDesign = await fetchDesign(designID);
      onDesignUpdated(updatedDesign);

      setSuccessMessage("Successfully updated model on Printables");
    } catch (error) {
      log.error("Error updating Printables model:", error);
      setErrorMessage(`Failed to update Printables model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const printablesPublishToPublic = async () => {
    if (!printablesStatus.printablesId || !accessToken) return;

    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/printables/model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-printables-token': accessToken
        },
        body: JSON.stringify({
          designId: designID,
          designData: {...design, draft: false},
          printablesId: printablesStatus.printablesId,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to publish Printables model");
      }

      const result = await response.json();
      setPrintablesStatus({
        status: 'published',
        printablesId: result.printablesId,
        url: `https://www.printables.com/model/${result.printablesId}`,
      });

      // Refetch design to get updated platforms data
      const updatedDesign = await fetchDesign(designID);
      onDesignUpdated(updatedDesign);

      setSuccessMessage("Successfully published to Printables");
    } catch (error) {
      log.error("Error publishing to Printables:", error);
      setErrorMessage(`Failed to publish to Printables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const needsSync = () => {
    if (!design || !printablesStatus.printablesId) return false;

    // Find Printables platform entry
    const printablesPlatform = design.platforms.find(p => p.platform === "PRINTABLES");
    if (!printablesPlatform) return false;

    // Compare timestamps - if design was updated after the platform record was updated
    const designUpdated = new Date(design.updated_at);
    const platformUpdated = new Date(printablesPlatform.updated_at);

    return designUpdated > platformUpdated;
  };

  return (
    <div className="mt-6 p-4 border border-gray-200 rounded-md">
      <h2 className="text-xl font-bold">Printables Publishing</h2>

      {!isAuthenticated ? (
        <p>Please log in to Printables to publish this design.</p>
      ) : (
        <div className="space-y-4">
          {printablesStatus.status === 'not_published' && (
            <Button
              onClick={printablesPublishToDraft}
              disabled={isPublishing}
              className="w-full"
            >
              {isPublishing ? 'Publishing...' : 'Publish to Printables (Draft)'}
            </Button>
          )}

          {printablesStatus.status === 'draft' && (
            <>
              <div className="flex items-center justify-between">
              <span>Status: Draft</span>
              {printablesStatus.url && (
                <Link
                  href={printablesStatus.url}
                  target="_blank"
                  className="text-blue-500 hover:underline block mt-1"
                >
                  View on Printables
                </Link>
              )}
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={printablesUpdateModel}
                  disabled={isPublishing}
                  className="flex-1"
                  variant={needsSync() ? "default" : "outline"}
                >
                  {isPublishing ? "Updating..." : needsSync() ? "Update Draft (Changes Detected)" : "Update Draft"}
                </Button>
                <Button
                  onClick={printablesPublishToPublic}
                  disabled={isPublishing}
                  className="flex-1"
                >
                  {isPublishing ? "Publishing..." : "Publish to Public"}
                </Button>
              </div>
            </>
          )}

          {printablesStatus.status === 'published' && (
            <>
            <div className="flex items-center justify-between">
              <span>Status: Published</span>
              {printablesStatus.url && (
                <Link
                  href={printablesStatus.url}
                  target="_blank"
                  className="text-blue-500 hover:underline block mt-1"
                >
                  View on Printables
                </Link>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={printablesUpdateModel}
                disabled={isPublishing}
                className="flex-1"
                variant={needsSync() ? "default" : "outline"}
              >
                {isPublishing ? "Updating..." : needsSync() ? "Update Published Design (Changes Detected)" : "Update Published Design"}
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

          {printablesStatus.status === 'error' && (
            <div className="flex items-center justify-between">
              <p className="text-red-500">There was an error with your Printables publishing.</p>
              <Button
                onClick={printablesPublishToDraft}
                disabled={isPublishing}
                className="mt-2"
              >
                {isPublishing ? "Publishing..." : "Try Again"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}