'use server';

import {
  DesignCreateSchema,
  DesignUpdateSchema,
  designSchema,
  designUpdateSchema, designCreateSchema
} from "@/src/app/components/design/types";
import log from "electron-log/renderer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function createDesign(formData: DesignCreateSchema) {
  try {
    const payload = designCreateSchema.parse(formData);
    const response = await fetch(`${API_URL}/api/design`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      log.error(response);
      throw new Error("Failed to create design");
    }

    return await response.json();
  } catch (error) {
    log.error(error);
    throw new Error("Error creating design");
  }
}

export async function updateDesign(designID: string, formData: DesignUpdateSchema) {
  try {
    const payload = designUpdateSchema.parse(formData)
    const response = await fetch(`${API_URL}/api/design/${designID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      log.error(response);
      throw new Error("Failed to update design");
    }

    return await response.json();
  } catch (error) {
    log.error(error);
    throw new Error("Error updating design");
  }
}

export async function fetchDesign(designID: string) {

  try {
    const response = await fetch(`${API_URL}/api/design/${designID}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      log.error(response);
      throw new Error("Failed to fetch design");
    }

    return designSchema.parse(await response.json());
  } catch (error) {
    log.error(error);
    throw new Error("Error fetching design");
  }
}
