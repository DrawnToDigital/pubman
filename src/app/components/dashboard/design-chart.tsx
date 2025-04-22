'use server';

import { cookies } from "next/headers";

const API_BASE = `${process.env.API_BASE}:${process.env.API_PORT}`;

interface Design {
  design_key: string;
  main_name: string;
  summary: string;
  description: string;
  license_key: string;
  is_ready: boolean;
  is_published: boolean;
  assets: { asset_key: string; file_name: string; url: string; mime_type: string; created_at: string }[];
  tags: { tag: string; platform: string }[];
  categories: { category: string; platform: string }[];
  created_at: string;
  updated_at: string;
}

export default async function DesignsChart() {
  const cookieJar = cookies();
  const accessToken = cookieJar.get('access-token')?.value;

  if (!accessToken) {
    return <p className="mt-4 text-gray-400">Access token is missing.</p>;
  }

  let designs: Design[] = [];
  try {
    const response = await fetch(`${API_BASE}/design`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch designs");
    }
    designs = await response.json();
  } catch (error) {
    console.error(error);
    return <p className="mt-4 text-gray-400">Failed to load designs.</p>;
  }

  if (!designs || designs.length === 0) {
    return <p className="mt-4 text-gray-400">No data available.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 p-5">
      {designs.map((model) => {
        const pubmanTags = model.tags.filter((tag) => tag.platform === "PUBMAN");
        const pubmanCategories = model.categories.filter((category) => category.platform === "PUBMAN");
        const imageAssets = model.assets.filter((asset) => asset.mime_type.startsWith("image/"));

        return (
          <div
            key={model.design_key}
            className="border rounded-lg shadow-md p-4 bg-white"
          >
            <h2 className="text-lg font-bold">{model.main_name} ({model.design_key})</h2>
            <p className="text-sm text-gray-600">{model.summary}</p>
            <p className="text-sm text-gray-600">{model.description}</p>
            <p className="text-sm text-gray-600">
              Tags:{" "}
              {pubmanTags.map((tag) => (
                <span
                  key={tag.tag}
                  className="mr-2 bg-gray-200 rounded-full px-2 py-1 text-xs font-semibold text-gray-700"
                >
                  {tag.tag}
                </span>
              ))}
            </p>
            <p className="text-sm text-gray-600">
              Category:{" "}
              {pubmanCategories.map((category) => (
                <span key={category.category} className="font-bold">
                  {category.category}
                </span>
              ))}
            </p>
            <p className="text-sm text-gray-600">License: {model.license_key}</p>
            <p className="text-sm text-gray-600">
              Created: {new Date(model.created_at).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">
              Last Updated: {new Date(model.updated_at).toLocaleDateString()}
            </p>

            {imageAssets.map((asset) => (
              <img
                key={asset.url}
                src={asset.url}
                alt={asset.file_name}
                className="mt-4 w-full h-32 object-cover rounded"
                loading="lazy" // Lazy-load images
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}