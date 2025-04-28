import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

// Matcher configuration
export const config = {
  matcher: ['/dashboard'],
};