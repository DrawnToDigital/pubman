"use client";

import { useEffect, useState } from 'react';

export default function CallbackPage() {
  const [message, setMessage] = useState("Finalizing authentication...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) {
      setMessage("Missing authorization code. Please try logging in again.");
      return;
    }
    const codeVerifier = sessionStorage.getItem('printables_code_verifier');
    if (!codeVerifier) {
      setMessage("Missing PKCE code verifier. Please try logging in again.");
      return;
    }
    const callbackUrl = `/api/printables/auth/callback/save?code=${encodeURIComponent(code)}&code_verifier=${encodeURIComponent(codeVerifier)}`;
    fetch(callbackUrl)
      .then(res => {
        if (!res.ok) throw new Error('Token exchange failed');
        return res.json();
      })
      .then(() => {
        setMessage("Authentication successful! You may close this window.");
        if (window.opener) {
          window.opener.postMessage({ type: 'PRINTABLES_AUTH_SUCCESS' }, '*');
        }
        window.close();
      })
      .catch(() => {
        setMessage("Authentication failed. Please try again.");
      })
      .finally(() => {
        sessionStorage.removeItem('printables_code_verifier');
      });
  }, []);

  return (
    <div>
      <p>{message}</p>
    </div>
  );
}
