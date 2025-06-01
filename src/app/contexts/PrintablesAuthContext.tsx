"use client";

import {createContext, ReactNode, useContext, useEffect, useState, useCallback} from "react";
import log from "electron-log/renderer";

export interface PrintablesUser {
  id: string;
  email: string;
  user: {
    id: string;
    handle: string;
    publicUsername: string;
    avatarFilePath: string;
  }
}

interface PrintablesAuthContextType {
  isAuthenticated: boolean;
  user: PrintablesUser | null;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => void
}

const PrintablesAuthContext = createContext<PrintablesAuthContextType | undefined>(undefined);

export function PrintablesAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<PrintablesUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Memoize checkAuth so the event listener always gets the latest reference
  const checkAuth = useCallback(async () => {
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
        log.info('>>> Printables User: {}', userData);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      log.error('Failed to check auth status:', error);
    }
  }, []);

  // Check for existing auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for PRINTABLES_AUTH_SUCCESS once, on mount
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data.type === 'PRINTABLES_AUTH_SUCCESS') {
        await checkAuth();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [checkAuth]);

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
      // No need to add event listener here anymore
    } catch (error) {
      log.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/printables/auth/token', { method: 'DELETE' });

      // Open a popup to clear cookies on Printables and Prusa3D domains
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const popup = window.open(
        '/api/printables/auth/logout',
        'printables-logout',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      // Wait a moment for cookies to clear, then close popup
      setTimeout(() => {
        if (popup && !popup.closed) popup.close();
      }, 2000);

      setUser(null);
      setIsAuthenticated(false);
      setAccessToken(null);
    } catch (error) {
      log.error('Logout failed:', error);
    }
  };

  return (
    <PrintablesAuthContext.Provider value={{
      isAuthenticated,
      user,
      accessToken,
      login,
      logout,
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
