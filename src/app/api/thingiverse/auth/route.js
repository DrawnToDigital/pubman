import { NextResponse } from 'next/server';

export async function GET(request) {
  // Redirect to the login endpoint
  return NextResponse.redirect(new URL('/api/thingiverse/auth/login', request.url));
}