import { NextRequest, NextResponse } from "next/server";
import log from "electron-log/renderer";
import path from "path";
import fs from "fs/promises";
import { customAlphabet } from "nanoid";
import AdmZip from "adm-zip";
import crypto from "crypto";
import { getDatabase } from "../../../../lib/betterSqlite3";

const nanoid = customAlphabet("1234567890abcdef", 10);

/**
 * Calculate MD5 hash of a buffer for content-based deduplication
 */
function calculateHash(buffer: Buffer): string {
  return crypto.createHash("md5").update(buffer).digest("hex");
}

/**
 * Get set of valid (non-deleted) asset file names for a design from the database
 * @param makerWorldDesignId - The MakerWorld design ID (platform_design_id), not PubMan's internal ID
 */
function getValidAssetFileNames(makerWorldDesignId: string): Set<string> {
  const validFiles = new Set<string>();
  try {
    const db = getDatabase();
    // Look up PubMan design ID via design_platform.platform_design_id
    // Then get all non-deleted assets for that design
    const assets = db.prepare(`
      SELECT da.file_path FROM design_asset da
      INNER JOIN design_platform dp ON da.design_id = dp.design_id
      WHERE dp.platform_design_id = ?
        AND da.deleted_at IS NULL
    `).all(makerWorldDesignId) as Array<{ file_path: string }>;

    for (const asset of assets) {
      // Extract just the filename from the path
      const fileName = path.basename(asset.file_path);
      validFiles.add(fileName);
    }
    log.info(`[Download] Found ${validFiles.size} valid assets in database for MakerWorld design ${makerWorldDesignId}`);
  } catch (error) {
    log.warn(`[Download] Could not query database for valid assets:`, error);
  }
  return validFiles;
}

/**
 * Find an existing file with the same content hash in the directory
 * Only considers files that are registered as non-deleted assets in the database
 */
async function findExistingFileByHash(dir: string, hash: string, ext: string, validFileNames: Set<string>): Promise<string | null> {
  // If no valid assets exist in database, there's nothing to deduplicate against
  if (validFileNames.size === 0) {
    log.info(`[Download] No valid assets in database, skipping deduplication`);
    return null;
  }

  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      // Only check files with matching extension
      if (!file.toLowerCase().endsWith(`.${ext}`)) continue;

      // Only consider files that are registered as valid (non-deleted) assets
      if (!validFileNames.has(file)) {
        continue;
      }

      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;

      const content = await fs.readFile(filePath);
      const fileHash = calculateHash(content);
      if (fileHash === hash) {
        log.info(`[Download] Found existing file with same content: ${file}`);
        return filePath;
      }
    }
  } catch (error) {
    // Directory might not exist yet, that's fine
  }
  return null;
}

// Allowed CDN domains for MakerWorld file downloads
const ALLOWED_CDN_DOMAINS = [
  "makerworld.com",
  "bambulab.com",
  "makerworld-model-files.bambulab.com",
  "makerworld.bblmw.com",
  "public-cdn.bambulab.com",
  "bblmw.com",
  "makerworld-us.bblmw.com",
  "makerworld-eu.bblmw.com",
];

// File extensions we want to extract from zip files
const EXTRACTABLE_EXTENSIONS = [
  // Model files
  "stl", "3mf", "obj", "step", "stp", "iges", "igs", "fbx", "gcode",
  // Image files
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif",
  // Project files
  "scad", "f3d", "blend",
];

interface DownloadRequest {
  url: string;
  designId: string;
  fileName: string;
  fileType: "model" | "image";
}

interface ExtractedFile {
  fileName: string;   // Clean display name (e.g., "Model.stl")
  fileExt: string;
  filePath: string;   // Full path with unique prefix (e.g., "/path/abc123_Model.stl")
  size: number;
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

      // Check for 418 status code which indicates captcha is required
      if (response.status === 418) {
        log.warn(`[Download] Captcha required for ${url}`);
        return NextResponse.json({
          error: "Captcha required",
          requiresCaptcha: true,
          captchaUrl: `https://makerworld.com/en/u/${url.includes('makerworld.com') ? 'download' : 'verification'}`,
        }, { status: 418 });
      }

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
      if (contentType.includes("application/zip") || contentType.includes("application/x-zip")) {
        fileExt = "zip";
      } else if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) {
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

    // Detect zip files by magic bytes (PK header) regardless of extension/content-type
    // This handles cases where MakerWorld returns a zip with wrong content-type
    const isZipByMagic = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B;
    if (isZipByMagic && fileExt !== "zip") {
      log.info(`[Download] Detected zip file by magic bytes (was: ${fileExt})`);
      fileExt = "zip";
    }

    // Calculate content hash for deduplication
    const contentHash = calculateHash(buffer);

    // Get valid (non-deleted) asset file names from database for deduplication
    const validFileNames = getValidAssetFileNames(designId);

    // Check if file with same content already exists (only among valid assets)
    const existingFile = await findExistingFileByHash(designDir, contentHash, fileExt, validFileNames);
    if (existingFile) {
      const existingStorageName = path.basename(existingFile);
      // Extract display name by removing the unique prefix (format: "abc123_Name.ext")
      const displayName = existingStorageName.replace(/^[a-f0-9]+_/, "") || existingStorageName;
      log.info(`[Download] Skipping duplicate file, using existing: ${existingStorageName}`);
      return NextResponse.json({
        success: true,
        filePath: existingFile,
        fileName: displayName,
        fileExt,
        size: buffer.length,
        deduplicated: true,
      });
    }

    // Generate unique storage filename and clean display name
    const baseName = path.basename(fileName, path.extname(fileName));
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
    const displayName = `${sanitizedBaseName}.${fileExt}`;
    const uniqueFileName = `${nanoid(6)}_${sanitizedBaseName}.${fileExt}`;
    const filePath = path.join(designDir, uniqueFileName);

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    log.info(`[Download] Saved ${filePath} (${buffer.length} bytes)`);

    // If it's a zip file, extract it and return extracted files
    if (fileExt === "zip") {
      log.info(`[Download] File is a zip, attempting extraction: ${filePath}`);
      try {
        const extractedFiles = await extractZipFile(filePath, designDir, validFileNames);
        log.info(`[Download] Extracted ${extractedFiles.length} files from zip`);

        // Delete the original zip file after extraction
        await fs.unlink(filePath);
        log.info(`[Download] Deleted original zip file: ${filePath}`);

        return NextResponse.json({
          success: true,
          isZip: true,
          extractedFiles,
          totalSize: extractedFiles.reduce((sum, f) => sum + f.size, 0),
        });
      } catch (extractError) {
        log.error("[Download] Failed to extract zip file:", extractError);
        // Fall back to returning the zip file itself
        return NextResponse.json({
          success: true,
          filePath,
          fileName: displayName,
          fileExt,
          size: buffer.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      filePath,
      fileName: displayName,
      fileExt,
      size: buffer.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("[Download] Failed to download file:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Extract files from a zip archive
 * Only extracts files with known model/image extensions
 * Deduplicates files by content hash (only among valid non-deleted assets)
 */
async function extractZipFile(zipPath: string, destDir: string, validFileNames: Set<string>): Promise<ExtractedFile[]> {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const extractedFiles: ExtractedFile[] = [];

  log.info(`[Download] Zip contains ${entries.length} entries`);

  for (const entry of entries) {
    // Skip directories
    if (entry.isDirectory) {
      log.info(`[Download] Skipping directory: ${entry.entryName}`);
      continue;
    }

    const entryName = entry.entryName;
    const ext = path.extname(entryName).slice(1).toLowerCase();

    log.info(`[Download] Processing zip entry: ${entryName} (ext: ${ext})`);

    // Only extract files with known extensions
    if (!EXTRACTABLE_EXTENSIONS.includes(ext)) {
      log.info(`[Download] Skipping file with unknown extension: ${entryName}`);
      continue;
    }

    // Get file data and calculate hash for deduplication
    const fileData = entry.getData();
    const contentHash = calculateHash(fileData);

    // Check if file with same content already exists (only among valid non-deleted assets)
    const existingFile = await findExistingFileByHash(destDir, contentHash, ext, validFileNames);
    if (existingFile) {
      const existingStorageName = path.basename(existingFile);
      // Extract display name by removing unique prefix
      const displayName = existingStorageName.replace(/^[a-f0-9]+_/, "") || existingStorageName;
      log.info(`[Download] Skipping duplicate from zip, using existing: ${existingStorageName}`);
      extractedFiles.push({
        fileName: displayName,
        fileExt: ext,
        filePath: existingFile,
        size: fileData.length,
      });
      continue;
    }

    // Generate unique storage filename and clean display name
    const baseName = path.basename(entryName, path.extname(entryName));
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
    const displayName = `${sanitizedBaseName}.${ext}`;
    const uniqueFileName = `${nanoid(6)}_${sanitizedBaseName}.${ext}`;
    const extractPath = path.join(destDir, uniqueFileName);

    // Extract the file
    await fs.writeFile(extractPath, fileData);

    log.info(`[Download] Extracted: ${entryName} -> ${extractPath} (${fileData.length} bytes)`);

    extractedFiles.push({
      fileName: displayName,
      fileExt: ext,
      filePath: extractPath,
      size: fileData.length,
    });
  }

  return extractedFiles;
}

