'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/src/app/components/ui/button";
import { fetchDesign } from "@/src/app/actions/design";
import { addFile, removeFile } from "@/src/app/actions/file";
import { DesignSchema } from "@/src/app/components/design/types";

const DesignDetailsPage = () => {
  const { designID } = useParams<{ designID: string }>();
  const [design, setDesign] = useState<DesignSchema | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        if (!designID) throw new Error("Design ID is required");
        const design = await fetchDesign(designID);
        setDesign(design);
      } catch (error) {
        console.error(error);
        setErrorMessage("Failed to load design details.");
      }
    };

    fetch();
  }, [designID]);

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
      <h1 className="text-2xl font-bold mb-4">{design.main_name}</h1>
      <p>{design.description}</p>

      <h2 className="text-xl font-bold mt-6">Files</h2>
      {design.assets.length > 0 ? (
        <ul>
          {design.assets.map((file) => (
            <li key={file.id} className="flex justify-between items-center">
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                {file.file_name}
              </a>
              <Button
                variant="destructive"
                onClick={() => handleFileRemove(file.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No files uploaded yet.</p>
      )}

      <Button onClick={handleFileAdd}>Add File</Button>

      {errorMessage && <div className="text-red-500 text-sm">{errorMessage}</div>}
    </div>
  );
};

export default DesignDetailsPage;