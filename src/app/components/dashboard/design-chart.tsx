'use client';

import {useEffect, useState} from 'react';
import { designSchema, DesignSchema } from "@/src/app/components/design/types";
import Link from "next/link";

// Helper to render publishing status with appropriate styling
function PublishStatus({ status }: { status: number }) {
  let statusText = "Not Published";
  let bgColor = "bg-gray-200";
  let textColor = "text-gray-700";

  if (status === 1) {
    statusText = "Draft";
    bgColor = "bg-yellow-100";
    textColor = "text-yellow-800";
  } else if (status === 2) {
    statusText = "Published";
    bgColor = "bg-green-100";
    textColor = "text-green-800";
  }

  return (
    <span className={`${bgColor} ${textColor} text-xs px-2 py-1 rounded-full font-medium`}>
      {statusText}
    </span>
  );
}

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
                  design.platforms.map((platform) => (
                    <div key={platform.platform} className="flex justify-between items-center">
                      <span className="text-xs font-medium">{
                        platform.platform === "PUBMAN"
                          ? "Pubman"
                          : platform.platform === "DUMMY"
                          ? "Dummy"
                          : platform.platform === "THINGIVERSE"
                          ? "Thingiverse"
                          : platform.platform
                      }:</span>
                      <div className="flex items-center gap-2">
                        <PublishStatus status={platform.published_status} />
                        {platform.platform_design_id && platform.published_status > 0 && (
                          <Link
                            href={platform.platform === "THINGIVERSE"
                              ? `https://www.thingiverse.com/thing:${platform.platform_design_id}`
                              : `#`}
                            target="_blank"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">Not published on any platform</span>
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