'use client';

import path from "path";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/src/app/components/ui/button";
import { fetchDesign, updateDesign } from "@/src/app/actions/design";
import {DesignSchema, thingiverseCategories} from "@/src/app/components/design/types";
import {FieldValues, useForm} from 'react-hook-form';
import {addFile, removeFile} from "@/src/app/actions/file";
import {Input} from "@/src/app/components/ui/input";
import {useRouter} from "next/navigation";
import { ThingiversePublishing } from "@/src/app/components/design/thingiverse-publishing";
import { PrintablesPublishing } from "@/src/app/components/design/printables-publishing";
import log from 'electron-log/renderer';
import TextEditor from "../../components/text-editor/editor";
import {printablesCategories} from "@/src/app/api/printables/printables-lib";
import {makerWorldCategories} from "@/src/app/api/makerworld/makerworld-lib";
import {MakerWorldPublishing} from "@/src/app/components/design/makerworld-publishing";

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
  const [description, setDescription] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const router = useRouter();
  const resetForm = (design: DesignSchema) => {
    reset({
        main_name: design.main_name,
        summary: design.summary,
        description: design.description,
        license_key: design.license_key,
        tags: design.tags.map(tag => tag.tag).join(', '),
        thingiverse_category: design.thingiverse_category || null,
        printables_category: design.printables_category || null,
        makerworld_category: design.makerworld_category || null,
      });
  }

  useEffect(() => {
    const fetch = async () => {
      try {
        if (designID) {
          const designData = await fetchDesign(designID.toString());
          setDesign(designData);
        }
      } catch (error) {
        log.error("Failed to fetch design:", error);
        setErrorMessage("Failed to load design details.");
      }
    };

    fetch();
  }, [designID]);

  const onSubmit = async (data: FieldValues) => {
    if (!design) return;

    try {
      data.description = description;
      const updatePayload: FieldValues = { ...data };
      if (data.thingiverse_category === undefined || data.thingiverse_category === null || data.thingiverse_category === '') delete updatePayload.thingiverse_category;
      if (data.printables_category === undefined || data.printables_category === null || data.printables_category === '') delete updatePayload.printables_category;
      if (data.makerworld_category === undefined || data.makerworld_category === null || data.makerworld_category === '') delete updatePayload.makerworld_category;

      await updateDesign(designID, updatePayload);
      const updatedDesign = await fetchDesign(designID);
      setDesign(updatedDesign);
      resetForm(updatedDesign);
      setEditMode(false);
    } catch (error) {
      log.error('Failed to update design:', error);
      setErrorMessage('Failed to update design. Please try again.');
    }
  };

  const handleFileAdd = async () => {
    if (!designID) return;

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const result = await window.electron.dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
      if (result.canceled) {
        log.info("No file selected!");
        return;
      }

      const filePaths = result.filePaths;
      if (!filePaths || filePaths.length === 0) {
        log.info("No files selected!");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const assetsDir = path.join(await window.electron.getAppDataPath(), "assets");
      await addFile(filePaths, assetsDir, designID);

      const updatedDesign = await fetchDesign(designID.toString());
      setDesign(updatedDesign);
    } catch (error) {
      log.error(error);
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
      log.error(error);
      setErrorMessage("Failed to remove file.");
    }
  };

  const handleDeleteDesign = async (designId: string) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
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
        log.error("Failed to delete design:", error);
        setErrorMessage("Failed to delete design. Please try again.");
      }
    }
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
              resetForm(design);
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
            <div className="w-full">
              <TextEditor
                onContentChange={setDescription}
                content={design.description}
              />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="thingiverse_category" className="text-sm font-medium mb-1">Thingiverse Category</label>
                <select
                  id="thingiverse_category"
                  {...register('thingiverse_category')}
                  defaultValue={design.thingiverse_category || ""}
                  className="border border-gray-300 rounded-md p-2 w-full"
                >
                  <option value="">
                    Select a category
                  </option>
                  {thingiverseCategories.options.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="printables_category" className="text-sm font-medium mb-1">Printables Category</label>
                <select
                  id="printables_category"
                  {...register('printables_category')}
                  defaultValue={design.printables_category || ""}
                  className="border border-gray-300 rounded-md p-2 w-full"
                >
                  <option value="">
                    Select a category
                  </option>
                  {Object.entries(printablesCategories).map(([category, cat]) => {
                    if ('disabled' in cat && cat.disabled) {
                      return (
                        <option key={category} value={category} disabled>
                          {category}
                        </option>
                      );
                    } else {
                      return (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      );
                    }
                  })}
                </select>
              </div>
              <div>
                <label htmlFor="makerworld_category" className="text-sm font-medium mb-1">MakerWorld Category</label>
                <select
                  id="makerworld_category"
                  {...register('makerworld_category')}
                  defaultValue={design.makerworld_category || ""}
                  className="border border-gray-300 rounded-md p-2 w-full"
                >
                  <option value="">
                    Select a category
                  </option>
                  {Object.entries(makerWorldCategories).map(([category, cat]) => {
                    if ('disabled' in cat && cat.disabled) {
                      return (
                        <option key={category} value={category} disabled>
                          {category}
                        </option>
                      );
                    } else {
                      return (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      );
                    }
                  })}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">License</label>
            <select
              {...register('license_key', { required: true })}
              defaultValue={design.license_key}
              className="w-full border rounded-md p-2"
            >
              <option value="" disabled>
                Select a license
              </option>
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
            <Button variant="outline" onClick={() => {
              resetForm(design)
              setEditMode(false)
            }}>Cancel</Button>
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
            <div
              className="prose text-gray-700 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: design.description }}
              onClick={e => {
                const target = e.target as HTMLElement;
                if (target.tagName === 'A') {
                  e.preventDefault();
                  // @ts-expect-error electron is defined in preload script
                  window.electron?.shell?.openExternal?.(target.getAttribute('href'));
                }
              }}
              onMouseOver={e => {
                const target = e.target as HTMLElement;
                if (target.tagName === 'A') {
                  target.setAttribute('title', target.getAttribute('href') || '');
                }
              }}
            />
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
                <div className="text-sm">
                  {design.thingiverse_category && <div>Thingiverse: {design.thingiverse_category}</div>}
                  {design.printables_category && <div>Printables: {design.printables_category}</div>}
                  {design.makerworld_category && <div>MakerWorld: {design.makerworld_category}</div>}
                  {!design.thingiverse_category && !design.printables_category && !design.makerworld_category && <div>Uncategorized</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thingiverse Publishing Section */}
      {design && (
        <ThingiversePublishing
          design={design}
          designID={designID.toString()}
          setErrorMessage={setErrorMessage}
          setSuccessMessage={setSuccessMessage}
          onDesignUpdated={(updatedDesign) => setDesign(updatedDesign)}
        />
      )}

      {/* Printables Publishing Section */}
      {design && (
        <PrintablesPublishing
          design={design}
          designID={designID.toString()}
          setErrorMessage={setErrorMessage}
          setSuccessMessage={setSuccessMessage}
          onDesignUpdated={(updateDesign) => setDesign(updateDesign)}
        />
      )}

      {/* MakerWorld Publishing Section */}
      {design && (
        <MakerWorldPublishing
          design={design}
          designID={designID.toString()}
          setErrorMessage={setErrorMessage}
          setSuccessMessage={setSuccessMessage}
          onDesignUpdated={(updatedDesign) => setDesign(updatedDesign)}
        />
      )}

      {/* File Management Section */}

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
