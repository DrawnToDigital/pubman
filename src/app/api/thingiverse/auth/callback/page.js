"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {NextResponse} from "next/server";
import log from 'electron-log/renderer';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.hash);
    const accessToken = searchParams.get('access_token');

    if (accessToken) {
      router.push(`/api/thingiverse/auth/callback/save?access_token=${accessToken}`); // Redirect to the save page with the access token
    } else {
      log.error('No access token received from Thingiverse');
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
  }, [router]);

  return null; // This component doesn't need to render anything
}