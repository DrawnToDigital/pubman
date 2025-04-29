import { NextResponse } from 'next/server';

// Replace these with your actual values
const THINGIVERSE_CLIENT_ID = process.env.THINGIVERSE_CLIENT_ID;
const REDIRECT_URI = process.env.THINGIVERSE_REDIRECT_URI || 'http://localhost:3000/api/thingiverse/auth/callback';

export async function GET() {
  const authUrl = `https://www.thingiverse.com/login/oauth/authorize?client_id=${THINGIVERSE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  return NextResponse.redirect(authUrl);
}