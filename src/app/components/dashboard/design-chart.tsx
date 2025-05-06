'use client';

import {useEffect, useState} from 'react';
import { designSchema, DesignSchema } from "@/src/app/components/design/types";
import Link from "next/link";

export default function DesignsChart() {
  const [designs, setDesigns] = useState<DesignSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDesigns() {
      try {
        const response = await fetch(`/api/design`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch designs");
        }
        const data = await response.json();
        setDesigns(designSchema.array().parse(data));
        setLoading(false);
      } catch (error) {
        console.error(error);
        setError("Failed to load designs.");
        setLoading(false);
      }
    }

    fetchDesigns();
  }, []);

  if (loading) {
    return <p className="mt-4 text-gray-400">Loading designs...</p>;
  }

  if (error) {
    return <p className="mt-4 text-gray-400">{error}</p>;
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

            {/* Platform Publishing Status */}
            <div className="mt-3 mb-3">
              <h3 className="text-sm font-semibold mb-1">Publishing Status:</h3>
              <div className="flex flex-col gap-1">
                {design.platforms && design.platforms.length > 0 ? (
                  design.platforms.map((platform) => {
                    // Check if design needs sync (updated after last platform update)
                    const designUpdated = new Date(design.updated_at);
                    const platformUpdated = new Date(platform.updated_at);
                    const needsSync = designUpdated > platformUpdated && platform.published_status > 0;
                    let statusText = "Not Published";
                    let bgColor = "bg-gray-200";
                    let textColor = "text-gray-700";
                    if (platform.published_status === 1) {
                      statusText = "Draft";
                      bgColor = "bg-yellow-100";
                      textColor = "text-yellow-800";
                    } else if (platform.published_status === 2) {
                      statusText = "Published";
                      bgColor = "bg-green-100";
                      textColor = "text-green-800";
                    }

                    return (
                      <div key={platform.platform} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500">{platform.platform}:</span>

                          <div className="flex items-center">
                            <span className={`${bgColor} ${textColor} text-xs px-2 py-1 rounded-full font-medium`}>
                              {statusText}
                            </span>
                            {needsSync && (
                              <div className="relative ml-2 group">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 text-amber-500"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                  />
                                </svg>
                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 bg-black text-white text-xs rounded p-2 shadow-lg z-10">
                                  Unsynced changes to design.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500">Not published on any platform</p>
                )}
              </div>
            </div>

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