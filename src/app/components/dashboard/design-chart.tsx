'use server';

import { designSchema, DesignSchema } from "@/src/app/components/design/types";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default async function DesignsChart() {
  let designs: DesignSchema[] = [];
  try {
    const response = await fetch(`${API_URL}/api/design`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch designs");
    }
    designs = designSchema.array().parse(await response.json());
  } catch (error) {
    console.error(error);
    return <p className="mt-4 text-gray-400">Failed to load designs.</p>;
  }

  if (!designs || designs.length === 0) {
    return <p className="mt-4 text-gray-400">No data available.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 p-5">
      {designs.map((design) => {
        const pubmanTags = design.tags.filter((tag) => tag.platform === "PUBMAN");
        const pubmanCategories = design.categories.filter((category) => category.platform === "PUBMAN");
        const imageAssets = design.assets.filter((asset) => ["jpg", "jpeg", "png", "gif"].includes(asset.file_ext.toLowerCase()));

        return (
          <div
            key={design.id}
            className="border rounded-lg shadow-md p-4 bg-white"
          >
            <h2 className="text-lg font-bold">{design.main_name} (<Link href={`/design/${design.id}`} className="text-blue-500 underline">
              {design.id}
              </Link>)</h2>
            <p className="text-sm text-gray-600">{design.summary}</p>
            <p className="text-sm text-gray-600">{design.description}</p>
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
            <p className="text-sm text-gray-600">License: {design.license_key}</p>
            <p className="text-sm text-gray-600">
              Created: {new Date(design.created_at).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">
              Last Updated: {new Date(design.updated_at).toLocaleDateString()}
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {imageAssets.slice(0, 2).map((asset) => (
                <div key={asset.id} className="bg-gray-100 rounded w-full h-auto flex items-center justify-center">
                  <img
                    key={asset.url}
                    src={asset.url}
                    alt={asset.file_name}
                    className="rounded object-contain max-w-full max-h-full"
                    loading="lazy"
                  />
                </div>
              ))}
              {imageAssets.length === 3 && (
                <div className="bg-gray-100 rounded w-full h-auto flex items-center justify-center">
                  <img
                    key={imageAssets[2].url}
                    src={imageAssets[2].url}
                    alt={imageAssets[2].file_name}
                    className="rounded object-contain max-w-full max-h-full"
                    loading="lazy"
                  />
                </div>
              )}
              {imageAssets.length > 3 && (
                <div className="flex items-center justify-center bg-gray-200 rounded w-full h-auto text-gray-700 font-bold text-lg">
                  +{imageAssets.length - 2}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}