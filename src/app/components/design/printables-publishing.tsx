'use client';

import { PlatformPublishing, PlatformPublishingProps } from "./platform-publishing";
import { printablesIsLicenseSupported } from "@/src/app/api/printables/printables-lib";
import { usePrintablesAuth } from "@/src/app/contexts/PrintablesAuthContext";

export function PrintablesPublishing(props: PlatformPublishingProps) {
  const { isAuthenticated, accessToken } = usePrintablesAuth();

  return (
    <PlatformPublishing
      {...props}
      platformName="Printables"
      platformKey="PRINTABLES"
      isAuthenticated={isAuthenticated}
      accessToken={accessToken}
      getPlatformStatus={(design) => {
        const printablesPlatform = design.platforms.find(p => p.platform === "PRINTABLES");
        if (!printablesPlatform) return { status: 'not_published' };
        return {
          status: printablesPlatform.published_status === 2 ? 'published' :
                  printablesPlatform.published_status === 1 ? 'draft' :
                  'not_published',
          id: printablesPlatform.platform_design_id,
          url: printablesPlatform.platform_design_id !== null ?
               `https://www.printables.com/model/${printablesPlatform.platform_design_id}` :
               undefined,
        }
      }}
      isValidForPlatform={(design, setErrorMessage) => {
        if (!design.main_name || design.main_name.trim() === "") {
          setErrorMessage("The design must have a name before publishing to Printables.");
          return false;
        }
        if (!design.assets || design.assets.length === 0) {
          setErrorMessage("You need to add at least one file before publishing to Printables");
          return false;
        }
        const hasImages = design.assets.some(asset =>
          ["jpg", "jpeg", "png"].includes(asset.file_ext.toLowerCase())
        );
        if (!hasImages) {
          setErrorMessage("You need to add at least one image before publishing to Printables");
          return false;
        }
        if (!printablesIsLicenseSupported(design.license_key)) {
          setErrorMessage("The selected license is not supported for Printables.");
          return false;
        }
        if (!design.printables_category) {
          setErrorMessage("A Printables category must be selected.");
          return false;
        }
        return true;
      }}
      publishDraft={async ({ design, designID, accessToken }) => {
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
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to publish to Printables");
        return {
          id: result.printablesId,
          url: `https://www.printables.com/model/${result.printablesId}`,
        };
      }}
      updateModel={async ({ design, designID, accessToken, platformId }) => {
        const response = await fetch(`/api/printables/model`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-printables-token': accessToken
          },
          body: JSON.stringify({
            designId: designID,
            designData: design,
            printablesId: platformId,
          })
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update Printables model");
        }
      }}
      publishPublic={async ({ design, designID, accessToken, platformId }) => {
        const response = await fetch(`/api/printables/model`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-printables-token': accessToken
          },
          body: JSON.stringify({
            designId: designID,
            designData: { ...design, draft: false },
            printablesId: platformId,
          })
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to publish Printables model");
        }
      }}
    />
  );
}
