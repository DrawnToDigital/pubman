"use client";

import { useEffect } from 'react';

export default function Page() {
  useEffect(() => {
    const AUTH_HOST = "https://account.prusa3d.com";
    const CLIENT_ID = "oamhmhZez7opFosnwzElIgE2oGgI2iJORSkw587O"; // PrusaSlicer
    const REDIRECT_URI = encodeURIComponent("prusaslicer://login");
    const SCOPE = "basic_info";
    const RESPONSE_TYPE = "code";
    const CODE_CHALLENGE_METHOD = "S256";
    const LANGUAGE = "en";

    function base64UrlEncode(str) {
      return btoa(String.fromCharCode(...new Uint8Array(str)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    async function sha256(plain) {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      const hash = await window.crypto.subtle.digest('SHA-256', data);
      return base64UrlEncode(hash);
    }
    function randomString(length) {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      const array = new Uint32Array(length);
      window.crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
      return result;
    }

    (async () => {
      const codeVerifier = randomString(40);
      const codeChallenge = await sha256(codeVerifier);

      // Store code_verifier in sessionStorage for later use in the callback
      sessionStorage.setItem('printables_code_verifier', codeVerifier);

      const url = `${AUTH_HOST}/o/authorize/?embed=1&client_id=${CLIENT_ID}&response_type=${RESPONSE_TYPE}` +
        `&code_challenge=${codeChallenge}&code_challenge_method=${CODE_CHALLENGE_METHOD}` +
        `&scope=${SCOPE}&redirect_uri=${REDIRECT_URI}&language=${LANGUAGE}`;

      window.location.href = url;
    })();
  }, []);

  return (
    <div>
      <p>Redirecting to Printables.com login...</p>
    </div>
  );
}
