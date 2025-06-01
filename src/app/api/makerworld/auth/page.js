"use client";

import { useState, useEffect } from "react";
import log from "electron-log/renderer";

export default function MakerWorldAuthPage() {
  const [step, setStep] = useState("login"); // login | code | done
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handles the initial login attempt
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const resp = await fetch("/api/makerworld/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }).then(r => r.json());

      if (resp.accessToken) {
        await saveToken(resp.accessToken);
        setStep("done");
      } else if (resp.loginType === "verifyCode") {
        setStep("code");
      } else if (resp.error) {
        setError(resp.error);
      } else {
        setError("Unexpected response from MakerWorld.");
      }
    } catch (err) {
      log.error("MakerWorld login failed:", err);
      setError(err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handles the code verification step
  const handleCode = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const resp = await fetch("/api/makerworld/auth/login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      }).then(r => r.json());

      if (resp.accessToken) {
        await saveToken(resp.accessToken);
        setStep("done");
      } else if (resp.error) {
        setError(resp.error);
      } else {
        setError("Invalid code or unexpected response.");
      }
    } catch (err) {
      log.error("MakerWorld code verification failed:", err);
      setError(err.message || "Code verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save token to backend
  const saveToken = async (token) => {
    const res = await fetch("/api/makerworld/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      throw new Error("Failed to save token");
    }
  };

  // UI rendering
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-xl font-bold mb-4">MakerWorld Login</h1>
      {step === "login" && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              className="border rounded w-full p-2"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block mb-1">Password</label>
            <input
              type="password"
              className="border rounded w-full p-2"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-red-600">{error}</div>}
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>
      )}
      {step === "code" && (
        <form onSubmit={handleCode} className="space-y-4">
          <div>
            <label className="block mb-1">Verification Code</label>
            <input
              type="text"
              className="border rounded w-full p-2"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="text-gray-600 text-sm">
            Enter the code sent to your email.
          </div>
          {error && <div className="text-red-600">{error}</div>}
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Verifying..." : "Verify"}
          </button>
        </form>
      )}
      {step === "done" && (
        <div>
          <div className="text-green-700 mb-4">Login successful! You may close this window.</div>
          {/* Notify opener and close window */}
          <ScriptOnDone />
        </div>
      )}
    </div>
  );
}

// Helper component to send message and close window on success
function ScriptOnDone() {
  // Only run effect once on mount
  useEffect(() => {
    try {
      if (window.opener) {
        window.opener.postMessage({ type: "MAKERWORLD_AUTH_SUCCESS" }, "*");
      }
      // Attempt to close the window after a short delay
      setTimeout(() => {
        window.close();
      }, 500);
    } catch (e) {
      console.error("Failed to notify opener or close window:", e);
    }
  }, []);
  return null;
}
