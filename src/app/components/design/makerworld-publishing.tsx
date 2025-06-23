'use client';

import { PlatformPublishing, PlatformPublishingProps } from "./platform-publishing";
import { isPubmanLicenseSupported, makerWorldImageFileTypes } from "@/src/app/api/makerworld/makerworld-lib";
import { useMakerWorldAuth } from "@/src/app/contexts/MakerWorldAuthContext";
import log from 'electron-log/renderer';

export function MakerWorldPublishing(props: PlatformPublishingProps) {
  const { isAuthenticated, accessToken } = useMakerWorldAuth();

  return (
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
        const response = await fetch(`/api/makerworld/model`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-makerworld-token': accessToken
          },
          body: JSON.stringify({
            designId: designID,
            designData: design
          })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to publish to MakerWorld");
        return {
          id: result.makerWorldId,
          url: `https://makerworld.com/en/my/models/drafts/${result.makerWorldId}/edit`,
        };
      }}
      updateModel={async ({ design, designID, accessToken, platformId, platformStatus }) => {
        const response = await fetch(`/api/makerworld/model`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-makerworld-token': accessToken
          },
          body: JSON.stringify({
            designId: designID,
            designData: design,
            makerWorldId: platformId,
            makerWorldStatus: platformStatus,
          })
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update MakerWorld model");
        }
        return {
          status: platformStatus,
          id: platformId,
          url: platformStatus === 'published'
            ? `https://makerworld.com/en/models/${platformId}`
            : `https://makerworld.com/en/my/models/drafts/${platformId}/edit`,
        };
      }}
      publishPublic={async ({ design, designID, accessToken, platformId }) => {
        const response = await fetch(`/api/makerworld/model`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-makerworld-token': accessToken
          },
          body: JSON.stringify({
            designId: designID,
            designData: { ...design, draft: false },
            makerWorldId: platformId,
          })
        });
        if (!response.ok) {
          const error = await response.json();
          log.error("Failed to publish MakerWorld model", error);
          throw new Error(error.message || "Failed to publish MakerWorld model");
        }
        const result = await response.json();
        const newDesignId = result.makerWorldId;
        return {
          id: newDesignId,
          url: `https://makerworld.com/en/models/${newDesignId}`,
        };
      }}
    />
  );
}
