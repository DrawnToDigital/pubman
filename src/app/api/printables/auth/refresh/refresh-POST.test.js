import { POST } from './route';
import { getDatabase } from '../../../../lib/betterSqlite3';
import log from 'electron-log/node';

jest.mock('../../../../lib/betterSqlite3', () => ({
  getDatabase: jest.fn(),
}));

function mockDb({ storedRefreshToken = 'stored-refresh-token' } = {}) {
  const get = jest.fn().mockReturnValue(storedRefreshToken ? { refresh_token: storedRefreshToken } : undefined);
  const run = jest.fn();
  const prepare = jest.fn(() => ({ get, run }));
  getDatabase.mockReturnValue({ prepare });
  return { prepare, get, run };
}

describe('POST /api/printables/auth/refresh', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('returns 404 and does not call the token endpoint when no refresh token is stored', async () => {
    const { run } = mockDb({ storedRefreshToken: null });

    const response = await POST();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: 'No refresh token available - user must log in again',
      requiresReauth: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('refreshes successfully and stores the new access token, refresh token, and expiry', async () => {
    const { prepare, run } = mockDb({ storedRefreshToken: 'old-refresh-token' });
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 7200,
        token_type: 'Bearer',
      }),
    });

    const response = await POST();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://account.prusa3d.com/o/token/',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(URLSearchParams),
      })
    );
    const sentBody = global.fetch.mock.calls[0][1].body;
    expect(sentBody.get('grant_type')).toBe('refresh_token');
    expect(sentBody.get('refresh_token')).toBe('old-refresh-token');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.token).toBe('new-access-token');
    expect(typeof body.expiresAt).toBe('string');

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE'));
    expect(run).toHaveBeenCalledWith('printables', 'new-access-token', 'new-refresh-token', expect.any(String));
  });

  it('carries the existing refresh token forward when the server does not rotate it', async () => {
    const { run } = mockDb({ storedRefreshToken: 'old-refresh-token' });
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-access-token', expires_in: 7200 }),
    });

    await POST();

    expect(run).toHaveBeenCalledWith('printables', 'new-access-token', 'old-refresh-token', expect.any(String));
  });

  it('clears stored tokens and returns 401 when the refresh token is rejected', async () => {
    const { run } = mockDb({ storedRefreshToken: 'dead-refresh-token' });
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_grant' }),
    });

    const response = await POST();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Refresh token expired or revoked',
      requiresReauth: true,
    });
    expect(run).toHaveBeenCalledWith('printables');
    expect(log.error).toHaveBeenCalled();
  });

  it('returns 500 if the OAuth server responds ok but omits the access token', async () => {
    mockDb({ storedRefreshToken: 'old-refresh-token' });
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ expires_in: 7200 }),
    });

    const response = await POST();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Access token not provided by OAuth server' });
  });

  it('returns 500 on unexpected errors', async () => {
    getDatabase.mockImplementation(() => {
      throw new Error('db unavailable');
    });

    const response = await POST();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});
