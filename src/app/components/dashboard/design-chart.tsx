"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import {designSchema, DesignSchema} from "../design/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {Edit, Trash2, Construction, CircleSlash, FileCheck, ChevronUp, ChevronDown, PlusIcon, SettingsIcon} from "lucide-react";
import Image from "next/image";
import log from 'electron-log/renderer';

type SortField = "main_name" | "created_at" | "updated_at";
type SortOrder = "asc" | "desc";

export default function DesignsChart() {
  const [designs, setDesigns] = useState<DesignSchema[]>([]);
  const [filter, setFilter] = useState("all"); // all, published, draft, local
  const [sortedDesigns, setSortedDesigns] = useState<DesignSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const filterTabs = [
    { id: "all", label: "All" },
    { id: "published", label: "Published" },
    { id: "draft", label: "Drafts" },
    { id: "local", label: "Local" }
  ];
  const [manageColumnsIsOpen, setManageColumnsIsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    thumbnail: true,
    summary: true,
    tags: true,
    category: true,
    created: true,
    updated: true,
    thingiverse: true,
    printables: true,
    makerworld: true,
  });
  const nonTdColumns = ["thumbnail", "summary"]; // toggleable columns that don't reduce the td count
  const requiredColumns = ["design", "actions"]; // columns always shown, not toggleable

  // Load visibleColumns from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("dashboard.visibleColumns");
    if (stored) {
      try {
        setVisibleColumns(JSON.parse(stored));
      } catch {
        // ignore parse errors, use default
      }
    }
  }, []);

  // Save visibleColumns to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("dashboard.visibleColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumnVisibility = (column: keyof typeof visibleColumns) => {
    setVisibleColumns((prevState: typeof visibleColumns) => ({
      ...prevState,
      [column]: !prevState[column],
    }));
  };

  const fetchDesigns = useCallback(async () => {
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
      log.error("Failed to fetch designs:", error);
      setErrorMessage("Failed to load designs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  // Listen for design updates (e.g., from MakerWorld sync)
  useEffect(() => {
    const handleDesignsUpdated = () => {
      fetchDesigns();
    };

    window.addEventListener("pubman:designs-updated", handleDesignsUpdated);
    return () => {
      window.removeEventListener("pubman:designs-updated", handleDesignsUpdated);
    };
  }, [fetchDesigns]);

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
        log.error("Failed to delete design:", error);
        setErrorMessage("Failed to delete design. Please try again.");
      }
    }
  };

  if (isLoading) {
    return <div className="space-y-4">Loading designs...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-4">
        <nav className="flex space-x-8">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`
                py-2 px-1 font-medium text-sm whitespace-nowrap border-b-2
                ${filter === tab.id 
                  ? "border-b-2 border-gray-500 text-gray-600" 
                  : "border-transparent text-gray-500 hover:border-gray-300"}
                transition-colors duration-200
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="text-red-500 font-bold">{errorMessage}</div>
        <div className="flex space-x-4">
          <Link href="/design/create-design">
            <Button className="ml-auto" variant="default">
              <PlusIcon/> Add New Design
            </Button>
          </Link>
          <div className="relative">
            <Button className="ml-auto" variant="outline"
            onClick={() => setManageColumnsIsOpen(!manageColumnsIsOpen)}>
              <SettingsIcon/> Manage Columns
            </Button>
            {manageColumnsIsOpen && (
              <div className="grid gap-4 absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Visible Columns</h4>
                  <p className="text-sm text-muted-foreground">
                    Select which columns to display.
                  </p>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox"
                      id="thumbnail"
                      checked={visibleColumns.thumbnail}
                      onChange={() => toggleColumnVisibility('thumbnail')}
                    />
                    <label htmlFor="thumbnail" className="flex items-center">
                      Thumbnail
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox"
                      id="summary"
                      checked={visibleColumns.summary}
                      onChange={() => toggleColumnVisibility('summary')}
                    />
                    <label htmlFor="summary" className="flex items-center">
                      Summary
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox"
                      id="tags"
                      checked={visibleColumns.tags}
                      onChange={() => toggleColumnVisibility('tags')}
                    />
                    <label htmlFor="tags" className="flex items-center">
                      Tags
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox"
                      id="category"
                      checked={visibleColumns.category}
                      onChange={() => toggleColumnVisibility('category')}
                    />
                    <label htmlFor="category" className="flex items-center">
                      Category
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox"
                      id="created"
                      checked={visibleColumns.created}
                      onChange={() => toggleColumnVisibility('created')}
                    />
                    <label htmlFor="created" className="flex items-center">
                      Created
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox"
                      id="updated"
                      checked={visibleColumns.updated}
                      onChange={() => toggleColumnVisibility('updated')}
                    />
                    <label htmlFor="updated" className="flex items-center">
                      Updated
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox"
                      id="thingiverse"
                      checked={visibleColumns.thingiverse}
                      onChange={() => toggleColumnVisibility('thingiverse')}
                    />
                    <label htmlFor="thingiverse" className="flex items-center">
                      <Image src="/thingiverse.png" alt="Thingiverse" width="20" height="20" className="mr-2" />
                      Thingiverse
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox"
                      id="printables"
                      checked={visibleColumns.printables}
                      onChange={() => toggleColumnVisibility('printables')}
                    />
                    <label htmlFor="printables" className="flex items-center">
                      <Image src="/printables.png" alt="Printables" width="20" height="20" className="mr-2" />
                      Printables
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox"
                      id="makerworld"
                      checked={visibleColumns.makerworld}
                      onChange={() => toggleColumnVisibility('makerworld')}
                    />
                    <label htmlFor="makerworld" className="flex items-center">
                      <Image src="/makerworld.png" alt="Makerworld" width="20" height="20" className="mr-2" />
                      Makerworld
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white shadow rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100"
                  onClick={() => handleSort("main_name")}
                >
                  Design {renderSortIndicator("main_name")}
                </th>
                {visibleColumns.tags && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                )}
                {visibleColumns.category && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                )}
                {visibleColumns.created && (
                  <th
                    className="px-4 py-3 text-left font-medium tracking-wider hover:bg-gray-100"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="text-xs text-gray-500 uppercase">Created {renderSortIndicator("created_at")}</div>
                  </th>
                )}
                {visibleColumns.updated && (
                  <th
                    className="px-4 py-3 text-left font-medium tracking-wider hover:bg-gray-100"
                    onClick={() => handleSort("updated_at")}
                  >
                    <div className="text-xs text-gray-500 uppercase">Updated {renderSortIndicator("updated_at")}</div>
                  </th>
                )}
                {visibleColumns.thingiverse && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <Image src="/thingiverse.png" alt="Thingiverse" width="30" height="30" />
                  </th>
                )}
                {visibleColumns.printables && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <Image src="/printables.png" alt="Printables" width="30" height="30" />
                  </th>
                )}
                {visibleColumns.makerworld && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <Image src="/makerworld.png" alt="Makerworld" width="30" height="30" />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedDesigns.length === 0 ? (
                <tr>
                  <td colSpan={
                    Object.entries(visibleColumns).filter(([col, shown]) => shown && !nonTdColumns.includes(col)).length
                    + requiredColumns.length
                  } className="px-4 py-4 text-center text-gray-500">
                    No designs found. <Link href="/design/create-design" className="text-blue-500 hover:underline">Create your first design</Link>
                  </td>
                </tr>
              ) : (
                sortedDesigns.map((design) => (
                  <tr key={design.id} className="hover:bg-gray-50">
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-3">
                        {visibleColumns.thumbnail && (
                          design.thumbnail ? (
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border bg-gray-100">
                              <Image
                                src={design.thumbnail} alt="Thumbnail" width={64} height={64} className="h-full w-full object-contain"
                                onError={({currentTarget}) => {
                                  currentTarget.src = "/default-thumbnail.png";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center bg-muted rounded-md border">
                              <span className="text-muted-foreground text-xs">No image</span>
                            </div>
                          )
                        )}
                        <div>
                          <Link
                            href={`/design/${design.id}`}
                            className="font-medium hover:underline"
                          >
                            {design.main_name}
                          </Link>
                          { visibleColumns.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {design.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {visibleColumns.tags && (
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
                    )}
                    {visibleColumns.category && (
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {design.thingiverse_category && <div className="text-xs">T: {design.thingiverse_category}</div>}
                          {design.printables_category && <div className="text-xs">P: {design.printables_category}</div>}
                          {design.makerworld_category && <div className="text-xs">M: {design.makerworld_category}</div>}
                          {!design.thingiverse_category && !design.printables_category && !design.makerworld_category && "Uncategorized"}
                        </div>
                      </td>
                    )}
                    {visibleColumns.created && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(design.created_at)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.updated && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {design.updated_at && formatDate(design.updated_at)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.thingiverse && (
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
                    )}
                    {visibleColumns.printables && (
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
                    )}
                    {visibleColumns.makerworld && (
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
                    )}
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
    </div>
  );
}
