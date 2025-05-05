'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/src/app/components/ui/button";
import { fetchDesign } from "@/src/app/actions/design";
import { DesignSchema } from "@/src/app/components/design/types";
import { useThingiverseAuth } from "@/src/app/contexts/ThingiverseAuthContext";
import Link from "next/link";
import {addFile, removeFile} from "@/src/app/actions/file";

const DesignDetailsPage = () => {
  const { designID } = useParams<{ designID: string }>();
  const [design, setDesign] = useState<DesignSchema | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const { isAuthenticated, accessToken } = useThingiverseAuth();

  // Thingiverse publication status
  const [thingiverseStatus, setThingiverseStatus] = useState<{
    status: 'not_published' | 'draft' | 'published' | 'error';
    thingId?: string | null;
    url?: string;
  }>({ status: 'not_published' });

  useEffect(() => {
    const fetch = async () => {
      try {
        if (designID) {
          const designData = await fetchDesign(designID.toString());
          setDesign(designData);

          // Check Thingiverse publication status
          if (designData.platforms) {
            const thingiversePlatform = designData.platforms.find((p) => p.platform === "THINGIVERSE");
            if (thingiversePlatform) {
              if (thingiversePlatform.published_status === 2) {
                setThingiverseStatus({
                  status: 'published',
                  thingId: thingiversePlatform.platform_design_id,
                  url: `https://www.thingiverse.com/thing:${thingiversePlatform.platform_design_id}`
                });
              } else if (thingiversePlatform.published_status === 1) {
                setThingiverseStatus({
                  status: 'draft',
                  thingId: thingiversePlatform.platform_design_id,
                  url: `https://www.thingiverse.com/thing:${thingiversePlatform.platform_design_id}`
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch design:", error);
        setErrorMessage("Failed to load design details.");
      }
    };

    fetch();
  }, [designID]);

  const publishToDraft = async () => {
    if (!design || !accessToken) return;

    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Check if we have assets - required for Thingiverse
      if (!design.assets || design.assets.length === 0) {
        setErrorMessage("You need to add at least one file before publishing to Thingiverse");
        return;
      }

      const response = await fetch('/api/thingiverse/things', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-thingiverse-token': accessToken
        },
        body: JSON.stringify({
          designId: designID,
          designData: design
        })
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
      setDesign(updatedDesign);

    } catch (error) {
      console.error("Failed to publish to Thingiverse:", error);
      setErrorMessage("Failed to publish to Thingiverse. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const updateDraft = async () => {
  if (!design || !accessToken || !thingiverseStatus.thingId) return;

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
        thingId: thingiverseStatus.thingId // Pass existing thingId to update
      })
    });

    if (!filesResponse.ok) {
      const errorData = await filesResponse.json();
      throw new Error(errorData.error || 'Failed to update files on Thingiverse');
    }

    setSuccessMessage('Successfully updated Thingiverse draft');

    // Refresh design data
    const updatedDesign = await fetchDesign(designID.toString());
    setDesign(updatedDesign);
  } catch (error) {
    console.error("Failed to update Thingiverse draft:", error);
    setErrorMessage("Failed to update Thingiverse draft. Please try again.");
  } finally {
    setIsPublishing(false);
  }
};

  const publishFinal = async () => {
    if (!thingiverseStatus.thingId || !accessToken) return;

    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/thingiverse/${thingiverseStatus.thingId}/publish`, {
        method: 'POST',
        headers: {
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
      setDesign(updatedDesign);

    } catch (error) {
      console.error("Failed to publish to Thingiverse:", error);
      setErrorMessage("Failed to publish to Thingiverse. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleFileAdd = async () => {
    if (!designID) return;

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const result = await window.electron.dialog.showOpenDialog({ properties: ['openFile'] });
      if (result.canceled) {
        console.log("No file selected!");
        return;
      }

      const filePath = result.filePaths[0];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const appDataPath = await window.electron.getAppDataPath();
      await addFile(filePath, appDataPath, designID);

      const updatedDesign = await fetchDesign(designID.toString());
      setDesign(updatedDesign);
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to upload files.");
    }
  };

  const handleFileRemove = async (assetID: string) => {
    if (!designID) return;

    try {
      await removeFile(designID, assetID);
      const updatedDesign = await fetchDesign(designID.toString());
      setDesign(updatedDesign);
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to remove file.");
    }
  };

  if (!design) return <div>Loading...</div>;

  return (
    <div className="space-y-6 bg-white p-6 rounded-md shadow-md max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">{design.main_name}</h1>

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          {successMessage}
        </div>
      )}

      <p>{design.description}</p>

      <div className="mt-4">
        <h2 className="text-xl font-bold">Details</h2>
        <p><strong>License:</strong> {design.license_key}</p>
        <p><strong>Created:</strong> {new Date(design.created_at).toLocaleDateString()}</p>
        <p><strong>Updated:</strong> {new Date(design.updated_at).toLocaleDateString()}</p>

        {design.tags && design.tags.length > 0 && (
          <p><strong>Tags:</strong> {design.tags.map(tag => tag.tag).join(', ')}</p>
        )}

        {design.categories && design.categories.length > 0 && (
          <p><strong>Categories:</strong> {design.categories.map(cat => cat.category).join(', ')}</p>
        )}
      </div>

      {/* Thingiverse Publishing Section */}
      <div className="mt-6 p-4 border border-gray-200 rounded-md">
        <h2 className="text-xl font-bold">Thingiverse Publishing</h2>

        {!isAuthenticated ? (
          <p>Please log in to Thingiverse to publish this design.</p>
        ) : (
          <div className="space-y-4">
            {thingiverseStatus.status === 'not_published' && (
              <Button
                onClick={publishToDraft}
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

                <div className="flex space-x-2">
                  <Button
                    onClick={updateDraft}
                    disabled={isPublishing}
                    className="flex-1"
                    variant="outline"
                  >
                    {isPublishing ? 'Updating...' : 'Update Draft'}
                  </Button>

                  <Button
                    onClick={publishFinal}
                    disabled={isPublishing}
                    className="flex-1"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish Final'}
                  </Button>
                </div>
              </>
            )}

            {thingiverseStatus.status === 'published' && (
              <div className="flex items-center justify-between">
                <span>Status: Published</span>
                {thingiverseStatus.url && (
                  <Link href={thingiverseStatus.url} target="_blank" className="text-blue-500 hover:underline">
                    View on Thingiverse
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold mt-6">Files</h2>
      <div className="mt-2 flex flex-col space-y-2">
        {design.assets && design.assets.length > 0 ? (
          design.assets.map((asset) => (
            <div key={asset.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>{asset.file_name}</span>
              <Button onClick={() => handleFileRemove(asset.id)} variant="destructive" size="sm">
                Remove
              </Button>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No files added yet.</p>
        )}
      </div>

      <Button onClick={handleFileAdd}>Add File</Button>
    </div>
  );
};

export default DesignDetailsPage;