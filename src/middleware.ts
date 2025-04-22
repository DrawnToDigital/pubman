import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateAccess, attemptRefresh } from '@/src/app/actions/auth';

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access-token')?.value;
  const refreshToken = request.cookies.get('refresh-token')?.value;
  const path = request.nextUrl.pathname;

  const publicPaths = ['/auth'];

  // Allow public paths to be accessed without authentication
  if (publicPaths.includes(path)) {
    return NextResponse.next();
  }

  // If no tokens are present, redirect to auth page
  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Attempt to validate tokens
  try {
    // Check if access token is valid
    let isValid = await validateAccess();
    if(isValid) {
      return NextResponse.next();
    }

    // If invalid access token, attempt refresh
    await attemptRefresh();
    isValid = await validateAccess();
    if(isValid) {
      return NextResponse.next();
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.redirect(new URL('/auth', request.url));
}

// Matcher configuration
export const config = {
  matcher: ['/dashboard'],
};