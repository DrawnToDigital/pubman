"use client";

import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import log from "electron-log/renderer";

export interface PrintablesUser {
  id: number;
  username: string;
  displayUsername: string;
}

interface PrintablesAuthContextType {
  isAuthenticated: boolean;
  user: PrintablesUser | null;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const PrintablesAuthContext = createContext<PrintablesAuthContextType | undefined>(undefined);

export function PrintablesAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<PrintablesUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Check for existing auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Get the token first
      const tokenResponse = await fetch('/api/printables/auth/token');
      if (!tokenResponse.ok) return;

      const { token } = await tokenResponse.json();
      if (!token) return;

      setAccessToken(token);

      // Then use the token to get user info
      const response = await fetch('/api/printables/user', {
        headers: {
          'x-printables-token': token
        }
      });

      if (response.ok) {
        const userData = await response.json();
        log.info('>>> UserData raw: {}', userData);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      log.error('Failed to check auth status:', error);
    }
  };

  const login = async () => {
    try {
      // Open a popup window for OAuth flow
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        '/api/printables/auth',
        'printables-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for completion message
      window.addEventListener('message', async (event) => {
        if (event.data.type === 'PRINTABLES_AUTH_SUCCESS') {
          popup?.close();
          await checkAuth();
        }
      }, { once: true });

    } catch (error) {
      log.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/printables/auth/token', { method: 'DELETE' });
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      log.error('Logout failed:', error);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/printables/auth/refresh', { method: 'POST' });
      if (response.ok) {
        await checkAuth();
      } else {
        log.error('Failed to refresh token:', response.text(), response.statusText);
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      log.error('Token refresh failed:', error);
      throw error;
    }
  };

  return (
    <PrintablesAuthContext.Provider value={{
      isAuthenticated,
      user,
      accessToken,
      login,
      logout,
      refreshToken
    }}>
      {children}
    </PrintablesAuthContext.Provider>
  );
}

export function usePrintablesAuth() {
  const context = useContext(PrintablesAuthContext);
  if (context === undefined) {
    throw new Error('usePrintablesAuth must be used within a PrintablesAuthProvider');
  }
  return context;
}