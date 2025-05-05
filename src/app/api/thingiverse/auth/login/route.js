import { NextResponse } from 'next/server';

// Replace these with your actual values
const THINGIVERSE_CLIENT_ID = process.env.THINGIVERSE_CLIENT_ID;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function GET() {
  const redirectUri = API_URL + '/api/thingiverse/auth/callback'
  const authUrl = `https://www.thingiverse.com/login/oauth/authorize?client_id=${THINGIVERSE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(authUrl);
}