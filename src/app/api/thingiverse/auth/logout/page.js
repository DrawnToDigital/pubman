"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    const LOGOUT_URL = "https://www.thingiverse.com/oauth/logout";
    (async () => {
        window.location.href = LOGOUT_URL;
    })();
  }, []);

  return (
    <div>
      <p>Logging out of Thingiverse...</p>
    </div>
  );
}
