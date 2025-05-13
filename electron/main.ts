import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell } from "electron";
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
const sampleAssetsPath =
  isProd
    ? path.join(process.resourcesPath, "sample_assets")
    : path.resolve("sample_assets"); // Dev Mode

async function initializeAppData() {
  log.info(`MAIN.ts ${os.platform()} ${os.arch()} ${process.electron} ${process?.versions?.electron}  ${process?.versions?.node}`);
  log.info(`Initializing app data dir ${appDataPath}`);
  if (existsSync(dbPath) && existsSync(assetsDir)) {
    log.info("App data already initialized.");
    return;
  }
  try {
    // Ensure appDataPath and db directory exist
    const dbDir = path.dirname(dbPath);
    await fs.mkdir(dbDir, { recursive: true });

    // Create or open the SQLite database
    const db = new Database(dbPath);
    log.info(`DB init script ${dbInitFilePath}`);

    // Read and execute SQL commands from init.txt
    const initSQL = await fs.readFile(dbInitFilePath, "utf-8");
    db.exec(initSQL);

    log.info("Database initialized successfully.");

    // Add sample assets
    await fs.mkdir(assetsDir, { recursive: true });
    const sampleImageSource = path.join(sampleAssetsPath, "example_image.png");
    const sampleImageDest = path.join(assetsDir, "example_image.png");
    await fs.copyFile(sampleImageSource, sampleImageDest);
    const sampleDesignSource = path.join(sampleAssetsPath, "example_design.stl");
    const sampleDesignDest = path.join(assetsDir, "example_design.stl");
    await fs.copyFile(sampleDesignSource, sampleDesignDest);

    log.info("Sample assets added successfully.");
  } catch (error) {
    log.error("Failed to initialize app data:", error);
  }
}


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

    let url = "http://localhost:3000";
    if (!is.dev) {
      const port = await startNextJSServer();
      url = `http://localhost:${port}`;
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
  initializeAppData().finally(() => {
    createWindow();
  });

  ipcMain.on("ping", () => log.info("pong"));
  ipcMain.handle("get-db-path", () => {
    return dbPath;
  })
  ipcMain.handle("get-app-data-path", () => {
    return appDataPath
  })
  ipcMain.handle("dialog:openFile", (event, args) => {
    return dialog.showOpenDialog(args[0]);
  });
  ipcMain.handle("dialog:showMessageBoxSync", (event, args) => {
    return dialog.showMessageBoxSync(args);
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
  if (process.platform !== "darwin") app.quit();
});
