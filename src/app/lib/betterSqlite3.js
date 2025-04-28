import path from "node:path";

export default function getBetterSqlite3() {
  if (process.platform === "darwin" && process.arch === 'arm64') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('better-sqlite3-darwin');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('better-sqlite3');
}

export function getDatabase() {
  let dbPath = "";
  try {
    const appGetPath = () => "appdata";

    if (appGetPath && process.env.NODE_ENV === 'production') {
      // Production in Electron
      const userDataPath = appGetPath('userData');
      dbPath = path.join(userDataPath, 'db', 'pubman.db');
    } else {
      // Local development or non-main Electron process
      const repoRoot = process.cwd();
      dbPath = path.join(repoRoot, 'appdata', 'db', 'pubman.db');
    }

    if (!dbPath || typeof dbPath !== "string") {
      throw new Error(`Invalid database path: ${dbPath}`);
    }

    console.log(`Database path: ${dbPath}`);
    const Database = getBetterSqlite3();
    const options = {
      verbose: console.log,
      nativeBinding: path.resolve('node_modules/better-sqlite3/build/Release/better_sqlite3.node')
    }
    if (process.platform === "darwin" && process.arch === 'arm64') {
      options.nativeBinding = path.resolve('node_modules/better-sqlite3-darwin/build/Release/better_sqlite3.node');
    }
    return new Database(dbPath, options);
  } catch (error) {
    console.error(`Failed to connect: ${dbPath}`, error);
    throw new Error(`Database failed to connect (${dbPath}): ${error.message}`);
  }
}