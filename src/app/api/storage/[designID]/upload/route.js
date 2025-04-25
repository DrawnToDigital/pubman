import { NextResponse } from "next/server";
import { app } from "electron";
import { join } from "path";
import { writeFile } from "fs/promises";
import { randomBytes } from "crypto";

const ALLOWED_EXTENSIONS = ["stl", "obj", "3mf", "jpg", "jpeg", "png", "gif"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request, { params }) {
  const { designID } = params;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !file.name) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const fileExtension = file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (fileBuffer.length > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds maximum size of 50MB" }, { status: 400 });
  }

  const userDataPath = app.getPath("userData");
  const filePath = join(
    userDataPath,
    "uploads",
    designID,
    `${randomBytes(16).toString("hex")}.${fileExtension}`
  );

  try {
    await writeFile(filePath, fileBuffer);
    return NextResponse.json({ message: "File uploaded successfully", filePath }, { status: 201 });
  } catch (error) {
    console.error("File upload failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}