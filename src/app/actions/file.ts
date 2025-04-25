'use server';

import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { customAlphabet } from 'nanoid';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const nanoid = customAlphabet('1234567890abcdef', 10);

export async function addFile(designID: string, file: File) {
  const appDataDir = path.join(app.getPath('userData'), 'designs', designID.padStart(5, '0'));
  const newFileName = `${nanoid(6)}_${file.name}`;
  const newFilePath = path.join(appDataDir, newFileName);

  try {
    // Ensure the design directory exists
    await fs.mkdir(appDataDir, { recursive: true });

    // Copy the file to the application data directory
    await fs.copyFile(file.path, newFilePath);

    // Insert metadata into the design_asset table
    await fetch(`${API_URL}/api/design/${designID}/asset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_path: newFilePath,
        mime_type: file.type,
        file_name: newFileName,
      }),
    }).then((response) => {
      if (!response.ok) {
        throw new Error('Failed to add file metadata');
      }
    })
  } catch (error) {
    console.error('Error adding file:', error);
    throw new Error('Failed to add file');
  }
}

export async function removeFile(designID: string, assetID: string) {
  try {
    await fetch(`${API_URL}/api/design/${designID}/asset/${assetID}`, {
      method: "DELETE",
    }).then((response) => {
      if (!response.ok) {
        throw new Error('Failed to remove file metadata');
      }
    })
  } catch (error) {
    console.error('Error removing file:', error);
    throw new Error('Failed to remove file');
  }
}