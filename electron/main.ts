import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { getPort } from "get-port-please";
import { startServer } from "next/dist/server/lib/start-server";
import path, { join } from "path";

function getAppDataPath() {
  switch (process.platform) {
    case "darwin": {
      return path.join(process.env.HOME || '/tmp', "Library", "Application Support", "PubMan");
    }
    case "win32": {
      return path.join(process.env.APPDATA || '/tmp', "PubMan");
    }
    case "linux": {
      return path.join(process.env.HOME || '/tmp', ".PubMan");
    }
    default: {
      console.log("Unsupported platform!");
      process.exit(1);
    }
  }
}

const appPath = __dirname;
const appDataPath =
  !process.env.NODE_ENV || process.env.NODE_ENV === "production"
    ? getAppDataPath() // Live Mode
    : path.join(appPath, "AppData"); // Dev Mode


const dbPath = path.join(appDataPath, "db/pubman.db");


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
    if (is.dev) {
      mainWindow.loadURL("http://localhost:3000");
    } else {
      try {
        const port = await startNextJSServer();
        console.log("Next.js server started on port:", port);
        mainWindow.loadURL(`http://localhost:${port}`);
      } catch (error) {
        console.error("Error starting Next.js server:", error);
      }
    }
  };

  loadURL();
  return mainWindow;
};

const startNextJSServer = async () => {
  try {
    const nextJSPort = await getPort({ portRange: [30_011, 50_000] });
    const webDir = join(app.getAppPath(), "app");

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
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
