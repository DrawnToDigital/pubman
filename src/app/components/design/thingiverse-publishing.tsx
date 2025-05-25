'use client';

import { PlatformPublishing, PlatformPublishingProps } from "./platform-publishing";
import { isPubmanLicenseSupported as thingiverseIsLicenseSupported } from "@/src/app/api/thingiverse/thingiverse-lib";
import { useThingiverseAuth } from "@/src/app/contexts/ThingiverseAuthContext";

export function ThingiversePublishing(props: PlatformPublishingProps) {
  const { isAuthenticated, accessToken } = useThingiverseAuth();

  return (
    <PlatformPublishing
      {...props}
      platformName="Thingiverse"
      platformKey="THINGIVERSE"
      isAuthenticated={isAuthenticated}
      accessToken={accessToken}
      getPlatformStatus={(design) => {
        const thingiversePlatform = design.platforms.find(p => p.platform === "THINGIVERSE");
        if (!thingiversePlatform) return { status: 'not_published' };
        return {
          status: thingiversePlatform.published_status === 2 ? 'published' :
                  thingiversePlatform.published_status === 1 ? 'draft' :
                  'not_published',
          id: thingiversePlatform.platform_design_id,
          url: thingiversePlatform.platform_design_id !== null ?
               `https://www.thingiverse.com/thing:${thingiversePlatform.platform_design_id}` :
               undefined,
        }
      }}
      isValidForPlatform={(design, setErrorMessage) => {
        if (!design.main_name || design.main_name.trim() === "") {
          setErrorMessage("The design must have a name before publishing to Thingiverse.");
          return false;
        }
        if (!design.description || design.description.trim() === "") {
          setErrorMessage("The design must have a description before publishing to Thingiverse.");
          return false;
        }
        if (!design.assets || design.assets.length === 0) {
          setErrorMessage("You need to add at least one file before publishing to Thingiverse");
          return false;
        }
        if (!thingiverseIsLicenseSupported(design.license_key)) {
          setErrorMessage("The selected license is not supported for Thingiverse.");
          return false;
        }
        if (!design.thingiverse_category) {
          setErrorMessage("A Thingiverse category must be selected.");
          return false;
        }
        return true;
      }}
      publishDraft={async ({ design, designID, accessToken }) => {
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
        if (!response.ok) throw new Error(data.error || 'Failed to publish to Thingiverse');
        return {
          id: data.thingiverseId,
          url: data.thingiverseUrl
        };
      }}
      updateModel={async ({ design, designID, accessToken, platformId }) => {
        // Update metadata
        const updateResponse = await fetch(`/api/thingiverse/${platformId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-thingiverse-token': accessToken
          },
          body: JSON.stringify({
            name: design.main_name,
            description: design.description,
            license: design.license_key || 'cc-by-sa',
            category: design.thingiverse_category,
            tags: design.tags ? design.tags.map(tag => tag.tag) : [],
          })
        });
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || 'Failed to update Thingiverse model');
        }
        // Update files
        const filesResponse = await fetch('/api/thingiverse/things', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-thingiverse-token': accessToken
          },
          body: JSON.stringify({
            designId: design.id,
            designData: design,
            thingId: platformId
          }),
        });
        if (!filesResponse.ok) {
          const errorData = await filesResponse.json();
          throw new Error(errorData.error || 'Failed to update files on Thingiverse');
        }
      }}
      publishPublic={async ({ platformId, accessToken }) => {
        const response = await fetch(`/api/thingiverse/${platformId}/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-thingiverse-token': accessToken
          }
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to publish to Thingiverse');
        }
      }}
    />
  );
}
