import { NextResponse } from "next/server";
import { app } from "electron";
import { join } from "path";
import { unlink, readFile } from "fs/promises";

export async function GET(request, { params }) {
    const { designID, assetID } = params;

    const userDataPath = app.getPath("userData");
    const filePath = join(userDataPath, "uploads", designID, assetID);

    try {
        const fileData = await readFile(filePath);
        return new Response(fileData, {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
          },
        });
    } catch (error) {
        console.error("File retrieval failed:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
  const { designID, assetID } = params;

  const userDataPath = app.getPath("userData");
  const filePath = join(userDataPath, "uploads", designID, assetID);

  try {
    await unlink(filePath);
    return NextResponse.json({ message: "File deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("File deletion failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}