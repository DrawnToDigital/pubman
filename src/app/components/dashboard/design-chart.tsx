"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import {designSchema, DesignSchema} from "../design/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Edit, Trash2, Construction, CircleSlash, FileCheck, ChevronUp, ChevronDown } from "lucide-react";
import Image from "next/image";

type SortField = "main_name" | "created_at" | "category" | "updated_at";
type SortOrder = "asc" | "desc";

export default function DesignsChart() {
  const [designs, setDesigns] = useState<DesignSchema[]>([]);
  const [filter, setFilter] = useState("all"); // all, published, draft, local
  const [sortedDesigns, setSortedDesigns] = useState<DesignSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

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
      } catch (error) {
        console.error("Failed to fetch designs:", error);
        setErrorMessage("Failed to load designs.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDesigns();
  }, []);

  useEffect(() => {
    const filteredDesigns = designs.filter(design => {
      if (filter === "published") {
        return design.platforms.some(p => p.published_status > 1);
      } else if (filter === "draft") {
        return design.platforms.some(p => p.published_status === 1);
      } else if (filter === "local") {
        return !design.platforms.some(p => p.published_status > 0);
      }
      return true; // filter == "all"
    });
    const sortedDesigns = filteredDesigns.sort((a, b) => {
      const sortModifier = sortOrder === "asc" ? 1 : -1;

      switch (sortField) {
        case "main_name":
          return sortModifier * a.main_name.localeCompare(b.main_name);
        case "created_at":
          return sortModifier * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case "updated_at":
          return sortModifier * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        case "category":
          return sortModifier * (a.categories[0]?.category || "").localeCompare(b.categories[0]?.category || "");
        default:
          return 0;
      }
    });
    setSortedDesigns(sortedDesigns);
  }, [designs, filter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;

    return sortOrder === "asc"
      ? <ChevronUp className="inline w-4 h-4 ml-1" />
      : <ChevronDown className="inline w-4 h-4 ml-1" />;
  };

  const getPlatformStatus = (design: DesignSchema, platform: string) => {
    const platformData = design.platforms.find(p => p.platform === platform);

    if (!platformData) return "local";

    if (platformData.published_status === 2) return "published";
    if (platformData.published_status === 1) return "draft";

    return "local";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <FileCheck className="text-green-500" />;
      case "draft":
        return <Construction className="text-amber-500" />;
      default:
        return <CircleSlash className="text-gray-400" />;
    }
  };

  const getPlatformStatusIcon = (design: DesignSchema, platform: string) => {
    const status = getPlatformStatus(design, platform);
    return getStatusIcon(status);
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDeleteDesign = async (designId: string) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const response = await  window.electron.dialog.showMessageBoxSync({
      type: 'warning',
      title: 'Delete Design',
      message: 'Are you sure you want to delete this design? This action cannot be undone.',
      buttons: ['Cancel', 'Delete'],
    })
    if (response === 1) {
      try {
        await fetch(`/api/design/${designId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        setDesigns(designs.filter(design => design.id !== designId));
      } catch (error) {
        console.error("Failed to delete design:", error);
        setErrorMessage("Failed to delete design. Please try again.");
      }
    }
  };

  if (isLoading) {
    return <div className="space-y-4">Loading designs...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="text-red-500 text-lg pb-4 text-center w-full">{errorMessage}</div>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100"
                  onClick={() => handleSort("main_name")}
                >
                  Name {renderSortIndicator("main_name")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100"
                  onClick={() => handleSort("category")}
                >
                  Category {renderSortIndicator("category")}
                </th>
                <th
                  className="px-4 py-3 text-left font-medium tracking-wider hover:bg-gray-100"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="text-xs text-gray-500 uppercase">Created {renderSortIndicator("created_at")}</div>
                  <div className="text-xs text-gray-500">Updated</div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Image src="/thingiverse.png" alt="Thingiverse" width="30" height="30" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Image src="/printables.png" alt="Printables" width="30" height="30" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Image src="/makerworld.png" alt="Makerworld" width="30" height="30" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedDesigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
                    No designs found. <Link href="/design/create-design" className="text-blue-500 hover:underline">Create your first design</Link>
                  </td>
                </tr>
              ) : (
                sortedDesigns.map((design) => (
                  <tr key={design.id} className="hover:bg-gray-50">
                    <td className="p-4 align-middle">
                        <div className="flex items-center gap-3">
                            {design.thumbnail ? (
                                <div className="h-16 w-16 overflow-hidden rounded-md border">
                                    <img
                                        src={design.thumbnail}
                                        alt={design.main_name}
                                        width={64}
                                        height={64}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src = "/placeholder.png";
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="h-16 w-16 flex items-center justify-center bg-muted rounded-md border">
                                    <span className="text-muted-foreground text-xs">No image</span>
                                </div>
                            )}
                            <div>
                                <Link
                                    href={`/design/${design.id}`}
                                    className="font-medium hover:underline"
                                >
                                    {design.main_name}
                                </Link>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {design.summary}
                                </p>
                            </div>
                        </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {design.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {tag.tag}
                          </span>
                        ))}
                        {design.tags.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            +{design.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {design.categories.length > 0 ? design.categories[0].category : "Uncategorized"}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(design.created_at)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {design.updated_at && formatDate(design.updated_at)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="inline-flex items-center justify-center h-8 w-8">
                              {getPlatformStatusIcon(design, "THINGIVERSE")}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Thingiverse: {getPlatformStatus(design, "THINGIVERSE") === "published"
                                ? `Published on ${formatDate(design.platforms.find(p => p.platform === "THINGIVERSE")?.published_at || '')}`
                                : getPlatformStatus(design, "THINGIVERSE") === "draft"
                                  ? "Draft (not published)"
                                  : "Not on Thingiverse"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="inline-flex items-center justify-center h-8 w-8">
                              {getPlatformStatusIcon(design, "PRINTABLES")}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Printables: {getPlatformStatus(design, "PRINTABLES") === "published"
                                ? `Published on ${formatDate(design.platforms.find(p => p.platform === "PRINTABLES")?.published_at || '')}`
                                : getPlatformStatus(design, "PRINTABLES") === "draft"
                                  ? "Draft (not published)"
                                  : "Not on Printables"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="inline-flex items-center justify-center h-8 w-8">
                              {getPlatformStatusIcon(design, "MAKERWORLD")}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Makerworld: {getPlatformStatus(design, "MAKERWORLD") === "published"
                                ? `Published on ${formatDate(design.platforms.find(p => p.platform === "MAKERWORLD")?.published_at || '')}`
                                : getPlatformStatus(design, "MAKERWORLD") === "draft"
                                  ? "Draft (not published)"
                                  : "Not on Makerworld"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/design/${design.id}`}>
                                <Button variant="ghost">
                                  <Edit />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit design</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" onClick={() => handleDeleteDesign(design.id)}>
                                <Trash2 className="text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete design</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end items-center mt-8">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "published" ? "default" : "outline"}
            onClick={() => setFilter("published")}
          >
            Published
          </Button>
          <Button
            variant={filter === "draft" ? "default" : "outline"}
            onClick={() => setFilter("draft")}
          >
            Drafts
          </Button>
          <Button
            variant={filter === "local" ? "default" : "outline"}
            onClick={() => setFilter("local")}
          >
            Local
          </Button>
        </div>
      </div>
    </div>
  );
}