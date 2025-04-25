'use server';

import { DesignCreateSchema } from "@/src/app/components/design/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';


export async function createDesign(formData: DesignCreateSchema) {
  const payload = {
    main_name: formData.main_name,
    description: formData.description,
    summary: formData.summary,
    tags: formData.tags,
    category: formData.category,
  };

  try {
    const response = await fetch(`${API_URL}/api/design`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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

export async function fetchDesign(designID: string) {

  try {
    const response = await fetch(`${API_URL}/api/design/${designID}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
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
