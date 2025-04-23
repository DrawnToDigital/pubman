'use server';

import {cookies} from "next/headers";
import {DesignCreateSchema} from "@/src/app/components/design/types";

const API_BASE = `${process.env.API_BASE}:${process.env.API_PORT}`;

export async function createDesign(formData: DesignCreateSchema) {

  const cookieJar = await cookies();
  const accessToken = cookieJar.get('access-token')?.value;

  const payload = {
    main_name: formData.main_name,
    description: formData.description,
    summary: formData.summary,
    tags: formData.tags.split(",").map(tag => tag.trim()),
    category: formData.category,
  };

  try {
    const response = await fetch(`${API_BASE}/design/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`},
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(response);
      throw new Error("Failed to create design");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    throw new Error("Error creating design");
  }
}

export async function fetchDesign(designKey: string) {
  const cookieJar = await cookies();
  const accessToken = cookieJar.get('access-token')?.value;

  try {
    const response = await fetch(`${API_BASE}/design/${designKey}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`},
    });

    if (!response.ok) {
      console.error(response);
      throw new Error("Failed to fetch design");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    throw new Error("Error fetching design");
  }
}

export async function uploadFile(designKey: string, file: File) {
  const cookieJar = await cookies();
  const accessToken = cookieJar.get('access-token')?.value;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE}/storage/${designKey}/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      console.error(response);
      throw new Error("Failed to upload files");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    throw new Error("Error uploading files");
  }
}

export async function removeFile(designKey: string, assetKey: string) {
  const cookieJar = await cookies();
  const accessToken = cookieJar.get('access-token')?.value;

  try {
    const response = await fetch(`${API_BASE}/storage/${designKey}/${assetKey}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(response);
      throw new Error("Failed to remove file");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    throw new Error("Error removing file");
  }
}