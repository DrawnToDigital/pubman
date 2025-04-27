import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow, ipcMain, dialog, protocol, net } from "electron";
import { getPort } from "get-port-please";
import { startServer } from "next/dist/server/lib/start-server";
import path, { join } from "path";
import nodeUrl from "node:url";
import * as process from "node:process";
import fs from "fs/promises";
import * as os from "node:os";
import { existsSync } from "node:fs";

const isProd = !process.env.NODE_ENV || process.env.NODE_ENV === "production";
const repoPath = path.normalize(__dirname + "/..");
const appDataPath =
  isProd
    ? app.getPath("userData") // Live Mode
    : path.join(repoPath, "appdata"); // Dev Mode
const dbPath = path.join(appDataPath, "db/pubman.db")
const dbInitFilePath =
  isProd
    ? path.join(appDataPath, "db/init.txt")
    : path.join(repoPath, "db/init.txt");
const assetsDir = path.join(appDataPath, "assets");
const sampleAssetsPath =
  isProd
    ? path.join(appDataPath, "sample_assets")
    : path.join(repoPath, "sample_assets");

function getBetterSqlite3() {
  if (!isProd && os.arch() === "arm64") {
    const modulePath = path.join(
      __dirname,
      `../node_modules/better-sqlite3-arm64/node_modules/better-sqlite3`
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(modulePath);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("better-sqlite3");
}

async function initializeAppData() {
  if (existsSync(dbPath) && existsSync(assetsDir)) {
    return;
  }
  const Database = getBetterSqlite3();
  try {
    // Ensure appDataPath and db directory exist
    const dbDir = path.dirname(dbPath);
    await fs.mkdir(dbDir, { recursive: true });

    // Create or open the SQLite database
    const db = new Database(dbPath);

    // Read and execute SQL commands from init.txt
    const initSQL = await fs.readFile(dbInitFilePath, "utf-8");
    db.exec(initSQL);

    console.log("Database initialized successfully.");

    // Add sample assets
    await fs.mkdir(assetsDir, { recursive: true });
    const sampleImageSource = path.join(sampleAssetsPath, "example_image.png");
    const sampleImageDest = path.join(assetsDir, "example_image.png");
    await fs.copyFile(sampleImageSource, sampleImageDest);
    const sampleDesignSource = path.join(sampleAssetsPath, "example_design.stl");
    const sampleDesignDest = path.join(assetsDir, "example_design.stl");
    await fs.copyFile(sampleDesignSource, sampleDesignDest);

    console.log("Sample assets added successfully.");
  } catch (error) {
    console.error("Failed to initialize app data:", error);
  }
}


const createWindow = () => {
  const mainWindow = new BrowserWindow({
    title: "PubMan",
    width: 900,
    height: 670,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });

  mainWindow.on('page-title-updated', function(e) {
    e.preventDefault()
  });

  mainWindow.on("ready-to-show", () => mainWindow.show());

  const loadURL = async () => {
    const maxRetries = 10; // Maximum number of retries
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
        mainWindow.loadURL(url);
        return;
      }
      attempt++;
      console.log(`Retrying to connect to server... (${attempt}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    console.error("Failed to connect to the server after maximum retries.");
    mainWindow.loadFile("path/to/fallback.html"); // Optional: Load a fallback page
  };

  loadURL();
  return mainWindow;
};

const startNextJSServer = async () => {
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
    });

    return nextJSPort;
  } catch (error) {
    console.error("Error starting Next.js server:", error);
    throw error;
  }
};

app.whenReady().then(() => {
  initializeAppData();
  createWindow();

  ipcMain.on("ping", () => console.log("pong"));
  ipcMain.handle("get-db-path", () => {
    return dbPath;
  })
  ipcMain.handle("get-app-data-path", () => {
    return appDataPath
  })
  ipcMain.handle("dialog:openFile", (event, args) => {
    return dialog.showOpenDialog(args[0]);
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  protocol.handle("local", async (req) => {
    try {
      const reqURL = new URL(req.url);
      let filePath = path.normalize(reqURL.pathname);
      console.log(filePath, assetsDir)
      if (filePath.startsWith("/assets/")){
        filePath = path.join(assetsDir, "..", filePath);
      }
      const fileURL = nodeUrl.pathToFileURL(filePath).toString();
      return net.fetch(fileURL);
    } catch (error) {
      console.error("Failed to handle local protocol:", error);
      throw new Error("Failed to load resource");
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
