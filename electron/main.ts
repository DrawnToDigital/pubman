import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, session } from "electron";
import { getPort } from "get-port-please";
import { startServer } from "next/dist/server/lib/start-server";
import path, { join } from "path";
import nodeUrl from "node:url";
import fs from "fs/promises";
import { existsSync } from "node:fs";
import getBetterSqlite3 from "@/src/app/lib/betterSqlite3";
import os from "node:os";
import log from 'electron-log/main';

// Prevent GetVSyncParametersIfAvailable() failures on Ubuntu
if (process.platform === "linux") {
  app.disableHardwareAcceleration();
}

// Use main logger
log.initialize();

const Database = getBetterSqlite3();

let mainWindow: BrowserWindow | null = null
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

const isProd = !process.env.NODE_ENV || process.env.NODE_ENV === "production";
const appDataPath =
  isProd
    ? app.getPath("userData") // Live Mode
    : path.resolve("appdata"); // Dev Mode
const dbPath =
  isProd
    ? path.join(appDataPath, "db/pubman.db") // Live Mode
    : path.resolve(appDataPath, "db/pubman.db"); // Dev Mode
const assetsDir = path.join(appDataPath, "assets");
const dbInitFilePath =
  isProd
    ? path.join(process.resourcesPath, "db/init.txt")
    : path.resolve("db/init.txt"); // Dev Mode
const migrationsDir =
  isProd
    ? path.join(process.resourcesPath, "db")
    : path.resolve("db"); // Dev Mode
const sampleAssetsPath =
  isProd
    ? path.join(process.resourcesPath, "sample_assets")
    : path.resolve("sample_assets"); // Dev Mode

async function runMigrations(db: typeof Database) {
  // Ensure migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Find all migration files
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter(f => /^migrations-\d+\.txt$/.test(f))
    .sort();

  // Get already applied migrations
  const applied = db.prepare("SELECT name FROM migrations").all().map((row: {name: string}) => row.name);
  const migrationFilesToApply = migrationFiles.filter(file => !applied.includes(file));
  if (migrationFilesToApply.length === 0) {
    log.info("No new migrations to apply.");
    return;
  } else {
    log.info(`Found ${migrationFilesToApply.length} new migrations to apply.`);
  }

  for (const file of migrationFilesToApply) {
    log.info(`Applying migration: ${file}`);
    const migrationSQL = await fs.readFile(path.join(migrationsDir, file), "utf-8");
    db.exec(migrationSQL);
    db.prepare("INSERT INTO migrations (name) VALUES (?)").run(file);
    log.info(`Migration applied: ${file}`);
  }
}

async function initializeAppData() {
  log.info(`MAIN.ts ${os.platform()} ${os.arch()} ${JSON.stringify(process.versions)}`);
  log.info(`Initializing app data dir ${appDataPath}`);
  const dbDir = path.dirname(dbPath);

  // Ensure appDataPath and db directory exist
  await fs.mkdir(dbDir, { recursive: true });

  // Open or create the database
  const db = new Database(dbPath);

  // Check if database needs initialization by looking for core tables
  // This handles the race condition where Next.js might create an empty db file
  // before Electron can initialize it
  let needsInit = false;
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='designer'").get();
    needsInit = !tableCheck;
  } catch (error: any) {
    // Only treat expected "no such table" errors as initialization-needed
    const message = error && typeof error.message === "string" ? error.message : "";
    if (/no such table/i.test(message)) {
      needsInit = true;
    } else {
      log.error("Error while checking for core database tables:", error);
      throw error;
    }
  }

  if (needsInit) {
    log.info(`DB init script ${dbInitFilePath}`);

    // Read and execute SQL commands from init.txt
    const initSQL = await fs.readFile(dbInitFilePath, "utf-8");
    db.exec(initSQL);

    log.info("Database initialized successfully.");
  }

  // Run migrations if any
  await runMigrations(db);

  db.close();

  // Add sample assets if assets dir does not exist
  if (!existsSync(assetsDir)) {
    await fs.mkdir(assetsDir, { recursive: true });
    const sampleImageSource = path.join(sampleAssetsPath, "example_image.png");
    const sampleImageDest = path.join(assetsDir, "example_image.png");
    await fs.copyFile(sampleImageSource, sampleImageDest);
    const sampleDesignSource = path.join(sampleAssetsPath, "example_design.stl");
    const sampleDesignDest = path.join(assetsDir, "example_design.stl");
    await fs.copyFile(sampleDesignSource, sampleDesignDest);

    log.info("Sample assets added successfully.");
  }
}

let serverPort = 3000; // Default port for Next.js server

const createWindow = () => {
  mainWindow = new BrowserWindow({
    title: "PubMan",
    width: 1350,
    height: 1005,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes("localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('page-title-updated', function(e) {
    e.preventDefault()
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());

  const loadURL = async () => {
    const maxRetries = 2; // Maximum number of retries
    const retryDelay = 1000; // Delay between retries in milliseconds
    let attempt = 0;

    let url = `http://localhost:${serverPort}`;
    if (!is.dev) {
      serverPort = await startNextJSServer();
      url = `http://localhost:${serverPort}`;
    }

    const isServerReady = async () => {
      return new Promise((resolve) => {
        const request = net.request(url);
        request.on("response", (response) => {
          resolve(response.statusCode === 200);
        });
        request.on("error", () => resolve(false));
        request.end();
      });
    };

    while (attempt < maxRetries) {
      if (await isServerReady()) {
        mainWindow?.loadURL(url);
        return;
      }
      attempt++;
      log.info(`Retrying to connect to server... (${attempt}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    log.error("Failed to connect to the server after maximum retries.");
    await mainWindow?.loadFile("path/to/fallback.html"); // Optional: Load a fallback page
  };

  loadURL();
  return mainWindow;
};

const startNextJSServer = async () => {
  log.info("Starting Next.js server...");
  try {
    const nextJSPort = await getPort({ portRange: [30_011, 50_000] });
    const webDir = join(app.getAppPath(), "app");
    process.env.NEXT_PUBLIC_API_URL = `http://localhost:${nextJSPort}`;
    process.env.NEXT_PUBLIC_APP_DATA_PATH = appDataPath;

    await startServer({
      dir: webDir,
      isDev: false,
      hostname: "localhost",
      port: nextJSPort,
      customServer: true,
      allowRetry: false,
      keepAliveTimeout: 5000,
      minimalMode: true,
    }).then(() => {
      // Override the "next-server (v1.2.3)" process title
      process.title = app.getName();
    });

    log.info(`Next.js server started on port ${nextJSPort}`);
    return nextJSPort;
  } catch (error) {
    log.error("Error starting Next.js server:", error);
    throw error;
  }
};

app.whenReady().then(() => {
  app.userAgentFallback = `PubMan/1.0 (${process.platform}; ${process.arch})`;

  initializeAppData().finally(() => {
    createWindow();
  });

  ipcMain.on("ping", () => log.info("pong"));
  ipcMain.handle("shell:openExternal", (event, url) => {
    return shell.openExternal(url);
  });
  ipcMain.handle("shell:showItemInFolder", (event, filePath) => {
    return shell.showItemInFolder(filePath);
  });
  ipcMain.handle("fs:stat", async (event, filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch (error) {
      return error;
    }
  })
  ipcMain.handle("get-db-path", () => {
    return dbPath;
  })
  ipcMain.handle("get-app-data-path", () => {
    return appDataPath
  })
  ipcMain.handle("dialog:openFile", (event, options) => {
    return dialog.showOpenDialog(options);
  });
  ipcMain.handle("dialog:showMessageBoxSync", (event, args) => {
    return dialog.showMessageBoxSync(args);
  });

  // MakerWorld authentication via BrowserWindow
  // Uses BambuLab's SSO flow to handle Cloudflare challenges in a real browser context
  ipcMain.handle("makerworld:auth", async () => {
    const AUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    return new Promise((resolve, reject) => {
      let settled = false;

      const authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        parent: mainWindow || undefined,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: "persist:makerworld", // Persistent session for cookies
        },
      });

      // Timeout to prevent indefinite hang if user abandons auth
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          log.warn("MakerWorld auth timed out");
          authWindow.close();
          reject(new Error("Authentication timed out"));
        }
      }, AUTH_TIMEOUT_MS);

      // Helper to extract token from MakerWorld session cookies
      const extractTokenFromSession = async (): Promise<string | null> => {
        const cookies = await session.fromPartition("persist:makerworld").cookies.get({ domain: ".makerworld.com" });
        const tokenCookie = cookies.find(c => c.name === "token");
        return tokenCookie?.value || null;
      };

      // Helper to handle successful authentication
      const handleAuthSuccess = (token: string, source: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        log.info(`MakerWorld auth successful via ${source}`);
        authWindow.close();
        resolve({ accessToken: token });
      };

      // Helper to handle authentication failure
      const handleAuthFailure = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        log.error("MakerWorld auth failed:", error.message);
        authWindow.close();
        reject(error);
      };

      // Build the login URL programmatically for maintainability
      // Redirect flow:
      // 1. User logs in at bambulab.com
      // 2. BambuLab redirects to makerworld.com/api/sign-in/ticket with a ticket
      // 3. MakerWorld sets a 'token' cookie and redirects to makerworld.com/en
      const makerWorldFinalUrl = "https://makerworld.com/en";
      const makerWorldTicketUrl = `https://makerworld.com/api/sign-in/ticket?to=${encodeURIComponent(makerWorldFinalUrl)}`;
      const loginUrl = `https://bambulab.com/en-us/sign-in?ticket=1&to=${encodeURIComponent(makerWorldTicketUrl)}`;

      authWindow.loadURL(loginUrl);

      // Monitor navigation to detect successful login
      authWindow.webContents.on("will-redirect", async (event, url) => {
        log.info("MakerWorld auth redirect:", url);

        // When redirected to makerworld.com/en, authentication is complete
        if (url.startsWith("https://makerworld.com/en")) {
          event.preventDefault();

          const token = await extractTokenFromSession();
          if (token) {
            handleAuthSuccess(token, "will-redirect");
          } else {
            handleAuthFailure(new Error("No token cookie found after authentication"));
          }
        }
      });

      // Also check did-navigate for cases where will-redirect doesn't fire
      authWindow.webContents.on("did-navigate", async (event, url) => {
        log.info("MakerWorld auth navigated to:", url);

        if (url.startsWith("https://makerworld.com/en")) {
          const token = await extractTokenFromSession();
          if (token) {
            handleAuthSuccess(token, "did-navigate");
          }
        }
      });

      authWindow.on("closed", () => {
        // Only reject if promise hasn't been settled yet
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error("Authentication window was closed"));
        }
      });
    });
  });

  // Clear MakerWorld session cookies for logout
  ipcMain.handle("makerworld:logout", async () => {
    const sess = session.fromPartition("persist:makerworld");
    await sess.clearStorageData({ storages: ["cookies"] });
    log.info("MakerWorld session cookies cleared");
    return { success: true };
  });

  // MakerWorld API fetch using the authenticated session
  // This routes requests through Electron's session which has Cloudflare cookies
  // Only allows requests to MakerWorld/BambuLab domains for security
  const ALLOWED_MAKERWORLD_DOMAINS = [
    "makerworld.com",
    "api.bambulab.com",
    "bambulab.com",
  ];

  ipcMain.handle("makerworld:fetch", async (event, url: string, options: { method?: string; headers?: Record<string, string>; body?: string }) => {
    // Validate URL is to an allowed domain
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error("Invalid URL");
    }

    const isAllowedDomain = ALLOWED_MAKERWORLD_DOMAINS.some(
      domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );
    if (!isAllowedDomain) {
      log.error(`makerworld:fetch blocked request to unauthorized domain: ${parsedUrl.hostname}`);
      throw new Error("Request to unauthorized domain");
    }

    const sess = session.fromPartition("persist:makerworld");

    try {
      const response = await sess.fetch(url, {
        method: options.method || "GET",
        headers: options.headers,
        body: options.body,
      } as RequestInit);

      const body = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body,
      };
    } catch (error) {
      log.error("MakerWorld fetch error:", error);
      throw error;
    }
  });

  // File system read for client-side file access
  // Only allows reading from the assets directory to prevent path traversal attacks
  ipcMain.handle("fs:readFile", async (event, filePath: string) => {
    // Resolve to absolute paths to prevent traversal attacks like "/assets/../../../etc/passwd"
    const resolvedAssetsDir = path.resolve(assetsDir);
    const resolvedFilePath = path.resolve(filePath);

    // Ensure the resolved path is within the assets directory
    if (!resolvedFilePath.startsWith(resolvedAssetsDir + path.sep) && resolvedFilePath !== resolvedAssetsDir) {
      log.error(`fs:readFile access denied: ${filePath} resolves outside assets directory`);
      throw new Error("Access denied: path outside assets directory");
    }

    const buffer = await fs.readFile(resolvedFilePath);
    return buffer;
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  protocol.handle("local", async (req) => {
    try {
      const reqURL = new URL(req.url);
      let filePath = path.normalize(decodeURI(reqURL.pathname));
      if (filePath.startsWith("/assets/")){
        filePath = path.join(assetsDir, "..", filePath);
      }
      const fileURL = nodeUrl.pathToFileURL(filePath).toString();
      return net.fetch(fileURL);
    } catch (error) {
      log.error("Failed to handle local protocol:", error);
      throw new Error("Failed to load resource");
    }
  });
  protocol.handle("prusaslicer", async (req) => {
    log.info("Redirecting", req.url);
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    return new Response('', { status: 302, headers: { Location: `http://localhost:${serverPort}/api/printables/auth/callback?code=${code}` } });
  })

  app.setAboutPanelOptions({
      applicationName: "PubMan",
      applicationVersion: app.getVersion(),
      version: "",
      credits: "DrawnToDigital",
      copyright: "Copyright 2025",
      website: "https://drawnto.digital/pubman",
      iconPath: "./public/icons/icon.png"
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
