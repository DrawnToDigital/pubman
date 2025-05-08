'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/src/app/components/ui/button";
import { fetchDesign, updateDesign } from "@/src/app/actions/design";
import {DesignSchema, pubmanCategories} from "@/src/app/components/design/types";
import {FieldValues, useForm} from 'react-hook-form';
import { useThingiverseAuth } from "@/src/app/contexts/ThingiverseAuthContext";
import Link from "next/link";
import {addFile, removeFile} from "@/src/app/actions/file";
import {Input} from "@/src/app/components/ui/input";
import {isPubmanLicenseSupported} from "@/src/app/api/thingiverse/thingiverse-lib";
import {useRouter} from "next/navigation";

const getLicenseName = (licenseKey: string): string => {
  const licenseMap: Record<string, string> = {
    'CC': 'Creative Commons',
    'CC0': 'Creative Commons — Public Domain',
    'CC-BY': 'Creative Commons — Attribution',
    'CC-BY-SA': 'Creative Commons — Attribution — Share Alike',
    'CC-BY-ND': 'Creative Commons — Attribution — NoDerivatives',
    'CC-BY-NC': 'Creative Commons — Attribution — Noncommercial',
    'CC-BY-NC-SA': 'Creative Commons — Attribution — Noncommercial — Share Alike',
    'CC-BY-NC-ND': 'Creative Commons — Attribution — Noncommercial — NoDerivatives',
    'GPL-2.0': 'GNU General Public License v2.0',
    'GPL-3.0': 'GNU General Public License v3.0',
    'LGPL': 'GNU Lesser General Public License',
    'BSD': 'BSD License',
    'SDFL': 'Standard Digital File License'
  };

  return licenseMap[licenseKey] || licenseKey;
};

const DesignDetailsPage = () => {
  const { designID } = useParams<{ designID: string }>();
  const [design, setDesign] = useState<DesignSchema | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { isAuthenticated, accessToken } = useThingiverseAuth();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const router = useRouter();

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

  function isValidForThingiverse(design: DesignSchema) {
    // Check if we have assets - required for Thingiverse
    if (!design.assets || design.assets.length === 0) {
      setErrorMessage("You need to add at least one file before publishing to Thingiverse");
      return false;
    }

    // Check if selected license is supported
    if (!isPubmanLicenseSupported(design.license_key)) {
      setErrorMessage("The selected license is not supported for Thingiverse.");
      return false;
    }
    return true;
  }


  const onSubmit = async (data: FieldValues) => {
    if (!design) return;

    try {
      await updateDesign(designID, data);
      const updatedDesign = await fetchDesign(designID);
      setDesign(updatedDesign);
      reset({
        main_name: updatedDesign.main_name,
        summary: updatedDesign.summary,
        description: updatedDesign.description,
        license_key: updatedDesign.license_key,
        tags: updatedDesign.tags.map(tag => tag.tag).join(', '),
        category: updatedDesign.categories.map(cat => cat.category)[0] || 'Other',
      });
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update design:', error);
      setErrorMessage('Failed to update design. Please try again.');
    }
  };

  const publishToDraft = async () => {
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

  const publishToPublic = async () => {
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

  const handleDeleteDesign = async (designId: string) => {
    const response = await  window.electron.dialog.showMessageBoxSync({
      type: 'warning',
      title: 'Delete Design',
      message: 'Are you sure you want to delete this design? This action cannot be undone.',
      buttons: ['Cancel', 'Delete'],
    })
    if (response === 1) {
      try {
        await fetch(`/api/design/${designId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        router.push('/dashboard');
      } catch (error) {
        console.error("Failed to delete design:", error);
        setErrorMessage("Failed to delete design. Please try again.");
      }
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

  if (!design) return <div>Loading...</div>;

  return (
    <div className="space-y-6 bg-white p-6 rounded-md shadow-md max-w-3xl mx-auto">
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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{editMode ? 'Edit Design' : design.main_name}</h1>
        <Button
          onClick={() => {
            if (editMode) {
              reset({
                main_name: design.main_name,
                summary: design.summary,
                description: design.description,
                license_key: design.license_key,
                tags: design.tags.map(tag => tag.tag).join(', '),
                category: design.categories.map(cat => cat.category)[0] || 'Other',
              });
            }
            setEditMode(!editMode);
          }}
          variant="outline"
        >
          {editMode ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {editMode ? (
        /* Edit Form */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              {...register('main_name', { required: true })}
              defaultValue={design.main_name}
              className="w-full"
            />
            {errors.main_name && <p className="text-red-500 text-sm">Name is required</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Summary</label>
            <textarea
              {...register('summary', { required: true })}
              defaultValue={design.summary}
              className="w-full border rounded-md p-2"
              rows={2}
            />
            {errors.summary && <p className="text-red-500 text-sm">Summary is required</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              {...register('description', { required: true })}
              defaultValue={design.description}
              className="w-full border rounded-md p-2"
              rows={6}
            />
            {errors.description && <p className="text-red-500 text-sm">Description is required</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <Input
              {...register('tags', { required: true })}
              defaultValue={design.tags.map(tag => tag.tag).join(', ')}
              className="w-full"
            />
            {errors.tags && <p className="text-red-500 text-sm">Tags are required</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categories</label>
            <select
              {...register('category', { required: true })}
              defaultValue={design.categories.length > 0 ? design.categories[0].category : 'Other'}
              required
              className="border border-gray-300 rounded-md p-2"
            >
              <option value="" disabled>
                Select a category
              </option>
              {pubmanCategories.options.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-sm">Category is required</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">License</label>
            <select
              {...register('license_key', { required: true })}
              defaultValue={design.license_key}
              className="w-full border rounded-md p-2"
            >
              <option value="CC">Creative Commons</option>
              <option value="CC0">Creative Commons — Public Domain</option>
              <option value="CC-BY">Creative Commons — Attribution</option>
              <option value="CC-BY-SA">Creative Commons — Attribution — Share Alike</option>
              <option value="CC-BY-ND">Creative Commons — Attribution — NoDerivatives</option>
              <option value="CC-BY-NC">Creative Commons — Attribution — Noncommercial</option>
              <option value="CC-BY-NC-SA">Creative Commons — Attribution — Noncommercial — Share Alike</option>
              <option value="CC-BY-NC-ND">Creative Commons — Attribution — Noncommercial — NoDerivatives</option>
              <option value="GPL-2.0">GNU General Public License v2.0</option>
              <option value="GPL-3.0">GNU General Public License v3.0</option>
              <option value="LGPL">GNU Lesser General Public License</option>
              <option value="BSD">BSD License</option>
              <option value="SDFL">Standard Digital File License</option>
            </select>
          </div>

          <div className="flex space-x-4">
            <Button type="submit">Save Changes</Button>
            <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        /* Display View */
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Summary</h2>
            <p className="text-gray-700">{design.summary}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <div className="text-gray-700 whitespace-pre-wrap">{design.description}</div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">License</p>
                <p>{getLicenseName(design.license_key)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p>{new Date(design.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p>{new Date(design.updated_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p>{design.is_published ? 'Published' : 'Draft'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tags</p>
                <p>{design.tags.map(tag => tag.tag).join(', ')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Categories</p>
                <p>{design.categories.map(cat => cat.category).join(', ')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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

                {thingiverseStatus.thingId && needsSync() && (
                  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4" role="alert">
                    <span className="font-bold">Design Modified:</span> Click <i>Update Draft</i> to sync your changes with Thingiverse
                  </div>
                )}

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
                    onClick={publishToPublic}
                    disabled={isPublishing}
                    className="flex-1"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish'}
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
                    onClick={updateDraft}
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

      <h2 className="text-xl font-bold">Danger Zone</h2>
      <Button variant="destructive" onClick={() => {handleDeleteDesign(design.id)}}>Delete</Button>
    </div>
  );
};

export default DesignDetailsPage;