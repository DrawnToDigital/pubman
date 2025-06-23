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
import Image from 'next/image';
import {CircleDashed, ExternalLinkIcon} from "lucide-react";

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

// TODO: Move this to a shared location
const pubmanImageFileTypes = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'svg'];

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

  useEffect(() => {
    // Set/unset global edit flag for navigation guards
    if (editMode) {
      // @ts-expect-error global var
      window.__pubman_isEditing = true;
    } else {
      // @ts-expect-error global var
      window.__pubman_isEditing = false;
    }
    return () => {
      // @ts-expect-error global var
      window.__pubman_isEditing = false;
    };
  }, [editMode]);

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

  // State for image preview
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // File status state for each asset (by id)
  const [fileStatus, setFileStatus] = useState<Record<string, {exists: boolean, modified: boolean}>>({});

  useEffect(() => {
    if (!design?.assets) return;
    design.assets.forEach((asset) => {
      if (!asset.original_file_path) return;
      (async () => {
        try {
          // @ts-expect-error window.electron is defined in preload script;
          const stat = await window.electron.fs.stat(asset.original_file_path);
          const mtime = new Date(stat.mtime).toISOString();
          const modified = !!(asset.original_file_mtime && mtime !== asset.original_file_mtime);
          setFileStatus(prev => ({ ...prev, [asset.id]: { exists: true, modified } }));
        } catch {
          setFileStatus(prev => ({ ...prev, [asset.id]: { exists: false, modified: false } }));
        }
      })();
    });
  }, [design?.assets]);

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
          editMode={editMode}
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
          editMode={editMode}
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
          editMode={editMode}
        />
      )}

      {/* File Management Section (Files/Assets) */}
      <h2 className="text-xl font-bold mt-6">Files</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">File</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Modified</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Original</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {design.assets && design.assets.length > 0 ? (
              design.assets.map((asset) => {
                const isImg = pubmanImageFileTypes.includes(asset.file_ext?.toLowerCase());
                const formatBytes = (bytes: number | null | undefined) => {
                  if (bytes === 0 || !bytes) return '-';
                  const k = 1024;
                  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                  const i = Math.floor(Math.log(bytes) / Math.log(k));
                  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                };
                const status = fileStatus[asset.id];
                return (
                  <tr key={asset.id} className="align-top">
                    <td className="px-4 py-2 flex gap-3">
                      {isImg ? (
                        <div className="w-18 h-18 relative">
                          <Image
                            src={asset.url}
                            alt={asset.file_name}
                            fill={true}
                            className="object-cover cursor-pointer"
                            onClick={() => setPreviewImg(asset.url)}
                          />
                        </div>
                      ) : (
                        <div className="w-18 h-18 flex items-center justify-center bg-gray-200 rounded text-gray-600 text-base font-bold">
                          {asset.file_ext?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>{asset.file_name}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{formatBytes(asset.original_file_size)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{asset.original_file_mtime ? new Date(asset.original_file_mtime).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2">
                      {asset.original_file_path ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={
                            // @ts-expect-error electron is defined in preload script
                            () => window.electron.shell.showItemInFolder(asset.original_file_path)
                          } title="Show in Finder" className="p-1 h-7 w-7 min-w-0">
                            <ExternalLinkIcon/>
                          </Button>
                          {status ? (
                            status.exists ? (
                              status.modified ? (
                                <span title="File has been modified since import" className="text-yellow-500">⚠️</span>
                              ) : (
                                <span title="File is unchanged" className="text-blue-500" style={{display:'inline-flex',alignItems:'center'}}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </span>
                              )
                            ) : (
                              <span title="File not found" className="text-red-500"><CircleDashed className="h-4 w-4"/></span>
                            )
                          ) : (<span className="text-gray-500">-</span>)}
                        </div>
                      ) : (<span className="text-gray-500">-</span>)}
                    </td>
                    <td className="px-4 py-2">
                      <Button onClick={() => handleFileRemove(asset.id)} variant="destructive" size="sm">Remove</Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={6} className="text-gray-500 px-4 py-4 text-center">No files added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Button onClick={handleFileAdd} className="mt-4">Add File</Button>
      {/* Image preview modal */}
      {previewImg && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={() => setPreviewImg(null)}>
          <img src={previewImg} alt="Preview" className="max-h-[80vh] max-w-[80vw] rounded shadow-lg" />
        </div>
      )}

      <h2 className="text-xl font-bold">Danger Zone</h2>
      <Button variant="destructive" onClick={() => {handleDeleteDesign(design.id)}}>Delete</Button>
    </div>
  );
};

export default DesignDetailsPage;
