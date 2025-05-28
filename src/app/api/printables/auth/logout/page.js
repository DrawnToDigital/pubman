"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    const LOGOUT_URL = "https://account.prusa3d.com/logout/";
    (async () => {
        window.location.href = LOGOUT_URL;
    })();
  }, []);

  return (
    <div>
      <p>Logging out of Printables...</p>
    </div>
  );
}
