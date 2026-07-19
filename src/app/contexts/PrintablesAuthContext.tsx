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

// Refresh proactively once the access token is within this long of expiring, rather than
// waiting for Printables to actually reject it.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
// How often to re-check while the app is open, so a long-lived session refreshes itself
// silently instead of sitting on a stale token between user actions (Printables access
// tokens are short-lived - ~2 hours as of this writing).
const RECHECK_INTERVAL_MS = 5 * 60 * 1000;

export function PrintablesAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<PrintablesUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Exchanges the stored refresh_token for a new access token. Returns null (rather than
  // throwing) on any failure - callers fall back to whatever token they already had, and
  // ultimately to prompting a fresh login if that's rejected too.
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/printables/auth/refresh', { method: 'POST' });
      if (!response.ok) {
        log.warn('Printables token refresh failed - user will need to log in again');
        return null;
      }
      const { token } = await response.json();
      return token || null;
    } catch (error) {
      log.error('Printables token refresh request failed:', error);
      return null;
    }
  }, []);

  // Memoize checkAuth so the event listener always gets the latest reference
  const checkAuth = useCallback(async () => {
    try {
      // Get the token first
      const tokenResponse = await fetch('/api/printables/auth/token');
      if (!tokenResponse.ok) return;

      const { token: initialToken, expiresAt } = await tokenResponse.json();
      let token = initialToken;
      if (!token) return;

      // Refresh proactively if the token is already expired or close to it, rather than
      // waiting for Printables to reject a stale one.
      const isNearExpiry = Boolean(expiresAt) && new Date(expiresAt).getTime() - Date.now() < REFRESH_MARGIN_MS;
      if (isNearExpiry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          token = refreshed;
        }
        // If refresh failed, fall through and try the possibly-stale token anyway - the
        // retry-on-401 below is the last line of defense.
      }

      setAccessToken(token);

      // Then use the token to get user info
      let response = await fetch('/api/printables/user', {
        headers: {
          'x-printables-token': token
        }
      });

      // The proactive expiry check above can miss cases (clock skew, early revocation) -
      // if Printables itself rejects the token, try refreshing once and retry before
      // giving up. Skip this if we just refreshed above (isNearExpiry) - no point
      // refreshing twice in a row.
      if (response.status === 401 && !isNearExpiry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          token = refreshed;
          setAccessToken(token);
          response = await fetch('/api/printables/user', {
            headers: { 'x-printables-token': token }
          });
        }
      }

      if (response.ok) {
        const userData = await response.json();
        log.info('>>> Printables User: {}', userData);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      log.error('Failed to check auth status:', error);
    }
  }, [refreshAccessToken]);

  // Check for existing auth on mount, then periodically re-check so a long-lived session
  // keeps refreshing itself instead of going stale until the next user action.
  useEffect(() => {
    checkAuth();
    const interval = setInterval(checkAuth, RECHECK_INTERVAL_MS);
    return () => clearInterval(interval);
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
