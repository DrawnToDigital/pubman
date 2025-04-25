'use server';

import fs from 'fs/promises';
import path from 'path';
import { customAlphabet } from 'nanoid';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const nanoid = customAlphabet('1234567890abcdef', 10);

export async function addFile(filePath: string, storagePath: string, designID: string) {
  const appDataDir = path.join(storagePath, 'designs', designID.padStart(5, '0'));
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(fileName);
  const newFileName = `${nanoid(6)}_${fileName}`;
  const newFilePath = path.join(appDataDir, newFileName);

  try {
    // Ensure the design directory exists
    await fs.mkdir(appDataDir, { recursive: true });

    // Copy the file to the application data directory
    await fs.copyFile(filePath, newFilePath);

    // Insert metadata into the design_asset table
    const response = await fetch(`${API_URL}/api/design/${designID}/asset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_path: newFilePath,
        file_ext: fileExtension.slice(1),  // remove the dot from the extension
        file_name: fileName,  // original file name
      }),
    })
    if (!response.ok) {
      throw new Error('Failed to add file metadata');
    }
  } catch (error) {
    console.error('Error adding file:', error);
    throw new Error('Failed to add file');
  }
}

export async function removeFile(designID: string, assetID: string) {
  try {
    const response = await fetch(`${API_URL}/api/design/${designID}/asset/${assetID}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error('Failed to remove file metadata');
    }
  } catch (error) {
    console.error('Error removing file:', error);
    throw new Error('Failed to remove file');
  }
}