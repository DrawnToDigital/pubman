"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import log from "electron-log/renderer";
import {z} from "zod";
import {UserInfoResponseSchema} from "@/src/app/api/makerworld/makerworld-lib";

export type MakerWorldUser = z.infer<typeof UserInfoResponseSchema>;

interface MakerWorldAuthContextType {
  isAuthenticated: boolean;
  user: MakerWorldUser | null;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const MakerWorldAuthContext = createContext<MakerWorldAuthContextType | undefined>(undefined);

export function MakerWorldAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<MakerWorldUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
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
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      log.error('Failed to check MakerWorld auth status:', error);
    }
  };

  const login = async () => {
    try {
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        '/api/makerworld/auth',
        'makerworld-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for completion message (future extension)
      window.addEventListener('message', async (event) => {
        if (event.data.type === 'MAKERWORLD_AUTH_SUCCESS') {
          popup?.close();
          await checkAuth();
        }
      }, { once: true });

    } catch (error) {
      log.error('MakerWorld login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/makerworld/auth/token', { method: 'DELETE' });
      setUser(null);
      setIsAuthenticated(false);
      setAccessToken(null);
    } catch (error) {
      log.error('MakerWorld logout failed:', error);
    }
  };

  const refreshToken = async () => {
    // No refresh endpoint, just re-login
    await login();
  };

  return (
    <MakerWorldAuthContext.Provider value={{
      isAuthenticated,
      user,
      accessToken,
      login,
      logout,
      refreshToken
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
