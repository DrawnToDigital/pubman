"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import log from 'electron-log/renderer';

export interface ThingiverseUser {
  name: string;
  first_name: string;
  last_name: string;
  public_url: string; // https://www.thingiverse.com/{name}
  thumbnail: string; // https://cdn.thingiverse.com/site/img/default/avatar/avatar_default_thumb_medium.jpg
  things_url: string; // https://api.thingiverse.com/users/{name}/things
  count_of_designs: number;
  count_of_followers: number;
  count_of_following: number;
  collection_count: number;
  make_count: number;
  like_count: number;
}

export interface ThingiverseThing {
  id: number;
  name: string;
  thumbnail?: string;
  url?: string;
  public_url?: string;
  creator?: ThingiverseUser;
  added?: string;
  modified?: string;
  is_published?: number;
  is_wip?: number;
  is_featured?: boolean;
  is_nsfw?: boolean | null;
  is_ai?: boolean | null;
  like_count?: number;
  is_liked?: boolean;
  collect_count?: number;
  is_collected?: boolean;
  comment_count?: number;
  is_watched?: boolean;
  default_image?: never | null;
  description?: string;
  instructions?: string;
  description_html?: string;
  instructions_html?: string;
  details?: string;
  details_parts?: Array<Record<string, unknown>>;
  edu_details?: string;
  edu_details_parts?: Array<Record<string, unknown>> | null;
  license?: string;
  allows_derivatives?: boolean;
  files_url?: string;
  images_url?: string;
  likes_url?: string;
  ancestors_url?: string;
  derivatives_url?: string;
  tags_url?: string;
  tags?: Array<{name?: string, url?: string, count?: number, things_url?: string, absolute_url?: string}>;
  categories_url?: string;
  file_count?: number;
  is_purchased?: number;
  app_id?: number | null;
  download_count?: number;
  view_count?: number;
  education?: {
    grades?: Array<unknown>;
    subjects?: Array<unknown>;
  };
  remix_count?: number;
  make_count?: number;
  app_count?: number;
  root_comment_count?: number;
  moderation?: string | null;
  is_derivative?: boolean;
  ancestors?: Array<unknown>;
  can_comment?: boolean;
  type_name?: string;
  is_banned?: boolean;
  is_comments_disabled?: boolean;
  needs_moderation?: number;
  is_decoy?: number;
  zip_data?: {
    files?: Array<{
      name?: string;
      url?: string;
    }>;
  };
}

interface ThingiverseAuthContextType {
  isAuthenticated: boolean;
  user: ThingiverseUser | null;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const ThingiverseAuthContext = createContext<ThingiverseAuthContextType | undefined>(undefined);

export function ThingiverseAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<ThingiverseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Memoize checkAuth so the event listener always gets the latest reference
  const checkAuth = useCallback(async () => {
    try {
      // Get the token first
      const tokenResponse = await fetch('/api/thingiverse/auth/token');
      if (!tokenResponse.ok) return;

      const { token } = await tokenResponse.json();
      if (!token) return;

      setAccessToken(token);

      // Then use the token to get user info
      const response = await fetch('/api/thingiverse/user', {
        headers: {
          'x-thingiverse-token': token
        }
      });

      if (response.ok) {
        const userData = await response.json();
        log.info('>>> Thingiverse user: {}', userData);
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

  // Listen for THINGIVERSE_AUTH_SUCCESS once, on mount
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data.type === 'THINGIVERSE_AUTH_SUCCESS') {
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

      window.open(
        '/api/thingiverse/auth',
        'thingiverse-auth',
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
      await fetch('/api/thingiverse/logout', { method: 'POST' });
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      log.error('Logout failed:', error);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/thingiverse/auth/refresh', { method: 'POST' });
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
    <ThingiverseAuthContext.Provider value={{
      isAuthenticated,
      user,
      accessToken,
      login,
      logout,
      refreshToken
    }}>
      {children}
    </ThingiverseAuthContext.Provider>
  );
}

export function useThingiverseAuth() {
  const context = useContext(ThingiverseAuthContext);
  if (context === undefined) {
    throw new Error('useThingiverseAuth must be used within a ThingiverseAuthProvider');
  }
  return context;
}
