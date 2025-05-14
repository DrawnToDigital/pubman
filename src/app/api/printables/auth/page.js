"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import log from 'electron-log/renderer';

export default function Page() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accessToken) {
      log.error('Access token is required');
      return;
    }
    router.push(`/api/printables/auth/callback/save?access_token=${accessToken}`); // Redirect to the save page with the access token
  };

  return (
    <div>
      <h1>Enter Printables.com Access Token</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Access Token:
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            required
          />
        </label>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}