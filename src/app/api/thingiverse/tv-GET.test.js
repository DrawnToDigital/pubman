import { GET } from './route';
import { ThingiverseAPI } from './thingiverse-lib';

jest.mock('./thingiverse-lib', () => ({
  ThingiverseAPI: jest.fn().mockImplementation(() => ({
    getThingsByUsername: jest.fn(),
    getUserInfo: jest.fn(),
  })),
}));

describe('GET /api/thingiverse', () => {
  it('should return 200 and user things when username is provided', async () => {
    const mockGetThingsByUsername = jest.fn().mockResolvedValue([{ id: 1, name: 'Thing 1' }]);
    ThingiverseAPI.mockImplementation(() => ({ getThingsByUsername: mockGetThingsByUsername }));

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('mock-access-token'),
      },
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue('mock-username'),
        },
      },
    };

    const response = await GET(request);

    expect(mockGetThingsByUsername).toHaveBeenCalledWith('mock-username');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 1, name: 'Thing 1' }]);
  });

  it('should return 200 and user info when username is not provided', async () => {
    const mockGetUserInfo = jest.fn().mockResolvedValue({ id: 1, name: 'User' });
    ThingiverseAPI.mockImplementation(() => ({ getUserInfo: mockGetUserInfo }));

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('mock-access-token'),
      },
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue(null),
        },
      },
    };

    const response = await GET(request);

    expect(mockGetUserInfo).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 1, name: 'User' });
  });

  it('should return 401 if access token is missing', async () => {
    const request = {
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue(null),
        },
      },
    };

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Missing Thingiverse access token' });
  });

  it('should return 500 on internal server error', async () => {
    const mockGetUserInfo = jest.fn().mockRejectedValue(new Error('Internal error'));
    ThingiverseAPI.mockImplementation(() => ({ getUserInfo: mockGetUserInfo }));

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('mock-access-token'),
      },
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue(null),
        },
      },
    };

    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
    expect(console.error).toHaveBeenCalledWith(
      'Thingiverse API error:',
      expect.any(Error)
    );
  });
});