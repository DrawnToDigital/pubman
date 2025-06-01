import { NextResponse } from 'next/server';
import { PrintablesAPI } from '../../printables-lib';
import log from "electron-log/renderer";

export async function POST(request) {
  try {
    const accessToken = request.headers.get('x-printables-token');
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Printables access token' }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get('file');
    const fileName = formData.get('fileName') || file?.name;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();

    const api = new PrintablesAPI(accessToken);
    const fileMetadata = {}; // TODO: Add image metadata if needed
    const result = await api.uploadFile(fileName, Buffer.from(fileBuffer), fileMetadata);

    return NextResponse.json({"success": true, file: result}, { status: 201 });
  } catch (error) {
    log.error('Failed to upload file to Printables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}