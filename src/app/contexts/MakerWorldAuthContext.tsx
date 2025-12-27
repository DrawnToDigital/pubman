"use client";

import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import log from "electron-log/renderer";
import {z} from "zod";
import {UserInfoResponseSchema} from "@/src/app/api/makerworld/makerworld-lib";

// Extend Window interface for Electron IPC
declare global {
  interface Window {
    electron?: {
      makerworld?: {
        auth: () => Promise<{ accessToken: string }>;
        logout: () => Promise<{ success: boolean }>;
      };
    };
  }
}

export type MakerWorldUser = z.infer<typeof UserInfoResponseSchema>;

interface MakerWorldAuthContextType {
  isAuthenticated: boolean;
  user: MakerWorldUser | null;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

const MakerWorldAuthContext = createContext<MakerWorldAuthContextType | undefined>(undefined);

export function MakerWorldAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<MakerWorldUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Memoize checkAuth so the event listener always gets the latest reference
  const checkAuth = useCallback(async () => {
    try {
      const tokenResponse = await fetch('/api/makerworld/auth/token');
      if (!tokenResponse.ok) return;

      const { token } = await tokenResponse.json();
      if (!token) return;

      setAccessToken(token);

      const response = await fetch('/api/makerworld/user', {
        headers: {
          'x-makerworld-token': token
        }
      });

      if (response.ok) {
        const userData = await response.json();
        log.info('>>> MakerWorld User: {}', userData);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      log.error('Failed to check MakerWorld auth status:', error);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for MAKERWORLD_AUTH_SUCCESS once, on mount
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data.type === 'MAKERWORLD_AUTH_SUCCESS') {
        await checkAuth();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [checkAuth]);

  const login = async () => {
    try {
      if (!window.electron?.makerworld?.auth) {
        throw new Error('MakerWorld auth not available - are you running in Electron?');
      }

      // Use Electron IPC to open BrowserWindow for auth
      // This handles Cloudflare challenges in a real browser context
      const result = await window.electron.makerworld.auth();

      if (result.accessToken) {
        // Store token via API for session persistence
        await fetch('/api/makerworld/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: result.accessToken }),
        });

        // Refresh auth state
        await checkAuth();
      }
    } catch (error) {
      log.error('MakerWorld login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/makerworld/auth/token', { method: 'DELETE' });

      // Also clear Electron session cookies
      if (window.electron?.makerworld?.logout) {
        await window.electron.makerworld.logout();
      }

      setUser(null);
      setIsAuthenticated(false);
      setAccessToken(null);
    } catch (error) {
      log.error('MakerWorld logout failed:', error);
    }
  };

  return (
    <MakerWorldAuthContext.Provider value={{
      isAuthenticated,
      user,
      accessToken,
      login,
      logout,
    }}>
      {children}
    </MakerWorldAuthContext.Provider>
  );
}

export function useMakerWorldAuth() {
  const context = useContext(MakerWorldAuthContext);
  if (context === undefined) {
    throw new Error('useMakerWorldAuth must be used within a MakerWorldAuthProvider');
  }
  return context;
}
