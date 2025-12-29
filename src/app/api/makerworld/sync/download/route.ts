import { NextRequest, NextResponse } from "next/server";
import log from "electron-log/renderer";
import path from "path";
import fs from "fs/promises";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("1234567890abcdef", 10);

// Allowed CDN domains for MakerWorld file downloads
const ALLOWED_CDN_DOMAINS = [
  "makerworld.com",
  "bambulab.com",
  "makerworld-model-files.bambulab.com",
  "makerworld.bblmw.com",
  "public-cdn.bambulab.com",
];

interface DownloadRequest {
  url: string;
  designId: string;
  fileName: string;
  fileType: "model" | "image";
}

/**
 * POST /api/makerworld/sync/download
 * Downloads a file from MakerWorld CDN and saves it to local storage
 */
export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json();
    const { url, designId, fileName, fileType } = body;

    if (!url || !designId || !fileName) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Validate URL domain
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const isAllowedDomain = ALLOWED_CDN_DOMAINS.some(
      domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowedDomain) {
      log.warn(`[Download] Blocked download from unauthorized domain: ${parsedUrl.hostname}`);
      return NextResponse.json({ error: "Unauthorized domain" }, { status: 403 });
    }

    // Get app data path
    const appDataPath = process.env.NEXT_PUBLIC_APP_DATA_PATH || path.resolve("appdata");
    const designDir = path.join(appDataPath, "designs", designId.padStart(5, "0"));

    // Ensure directory exists
    await fs.mkdir(designDir, { recursive: true });

    // Download the file
    log.info(`[Download] Fetching ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PubMan/1.0",
      },
    });

    if (!response.ok) {
      log.error(`[Download] Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      return NextResponse.json({
        error: `Failed to download: ${response.status} ${response.statusText}`
      }, { status: 502 });
    }

    // Get file data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension from URL or Content-Type
    let fileExt = path.extname(fileName).slice(1).toLowerCase();
    if (!fileExt) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) {
        fileExt = "jpg";
      } else if (contentType.includes("image/png")) {
        fileExt = "png";
      } else if (contentType.includes("image/gif")) {
        fileExt = "gif";
      } else if (contentType.includes("image/webp")) {
        fileExt = "webp";
      } else if (contentType.includes("model/stl") || contentType.includes("application/sla")) {
        fileExt = "stl";
      } else if (contentType.includes("model/3mf") || contentType.includes("application/vnd.ms-package.3dmanufacturing-3dmodel+xml")) {
        fileExt = "3mf";
      } else {
        // Try to infer from URL path
        const urlPath = parsedUrl.pathname;
        const urlExt = path.extname(urlPath).slice(1).toLowerCase();
        if (urlExt) {
          fileExt = urlExt;
        } else {
          fileExt = fileType === "model" ? "3mf" : "jpg";
        }
      }
    }

    // Generate unique filename
    const baseName = path.basename(fileName, path.extname(fileName));
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
    const uniqueFileName = `${nanoid(6)}_${sanitizedBaseName}.${fileExt}`;
    const filePath = path.join(designDir, uniqueFileName);

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    log.info(`[Download] Saved ${filePath} (${buffer.length} bytes)`);

    return NextResponse.json({
      success: true,
      filePath,
      fileName: uniqueFileName,
      fileExt,
      size: buffer.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("[Download] Failed to download file:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

