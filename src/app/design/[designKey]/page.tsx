'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/src/app/components/ui/input";
import { Button } from "@/src/app/components/ui/button";
import {fetchDesign, removeFile, uploadFile} from "@/src/app/actions/design";

const DesignDetailsPage = () => {
  const { designKey } = useParams();
  const [design, setDesign] = useState(null);
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Fetch design details
    const fetch = async () => {
      try {
        if (!designKey) throw new Error("Design key is required");
        const design = await fetchDesign (designKey.toString());
        setDesign(design);
      } catch (error) {
        console.error(error);
        setErrorMessage("Failed to load design details.");
      }
    };

    fetch();
  }, [designKey]);

  const handleFileUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !designKey) return;

    try {
      await uploadFile(designKey.toString(), file);
      setFile(null); // Clear the file input
      const updatedDesign = await fetchDesign(designKey.toString());
      setDesign(updatedDesign);
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to upload files.");
    }
  };

  const handleFileRemove = async (fileKey: string) => {
    if (!designKey) return;

    try {
      await removeFile(designKey.toString(), fileKey);
      const updatedDesign = await fetchDesign(designKey.toString());
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
            <li key={file.asset_key} className="flex justify-between items-center">
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                {file.file_name}
              </a>
              <Button
                variant="danger"
                onClick={() => handleFileRemove(file.asset_key)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No files uploaded yet.</p>
      )}

      <form onSubmit={handleFileUpload} className="mt-4">
        <Input
          type="file"
          multiple={false}
          onChange={(e) => e.target.files && setFile(e.target.files[0])}
          className="mb-4"
        />
        <Button type="submit">Upload Files</Button>
      </form>

      {errorMessage && <div className="text-red-500 text-sm">{errorMessage}</div>}
    </div>
  );
};

export default DesignDetailsPage;