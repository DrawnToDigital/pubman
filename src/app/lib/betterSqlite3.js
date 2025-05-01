import path from "node:path";

export default function getBetterSqlite3() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('better-sqlite3');
}

export function getDatabase() {
  let dbPath = "";
  try {
    if (process.env.NEXT_PUBLIC_APP_DATA_PATH) {
      console.log("getDatabase using process.env.NEXT_PUBLIC_APP_DATA_PATH");
      const userDataPath = process.env.NEXT_PUBLIC_APP_DATA_PATH;
      dbPath = path.join(userDataPath, 'db', 'pubman.db');
    } else {
      console.log("getDatabase using process.cwd()");
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
    }
    if (process.env.NODE_ENV === "development" && process.platform === "darwin" && process.arch === 'arm64') {
      options.nativeBinding = path.resolve('node_modules/better-sqlite3-darwin/build/Release/better_sqlite3.node');
    }
    return new Database(dbPath, options);
  } catch (error) {
    console.error(`Failed to connect: ${dbPath}`, error);
    throw new Error(`Database failed to connect (${dbPath}): ${error.message}`);
  }
}