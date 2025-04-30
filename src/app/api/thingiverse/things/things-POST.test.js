import { POST } from 'route';
import { ThingiverseAPI } from '../thingiverse-lib';

jest.mock('../thingiverse-lib', () => ({
  ThingiverseAPI: jest.fn().mockImplementation(() => ({
    createThing: jest.fn(),
  })),
}));

describe('POST /api/thingiverse/things', () => {
  it('should return 201 and create a new thing successfully', async () => {
    const mockCreateThing = jest.fn().mockResolvedValue({ id: 1, name: 'New Thing' });
    ThingiverseAPI.mockImplementation(() => ({ createThing: mockCreateThing }));

    const mockThingData = { name: 'New Thing' };
    const request = {
      headers: {
        get: jest.fn(key => key === 'x-thingiverse-token' ? 'mock-access-token' : null),
      },
      json: jest.fn().mockResolvedValue(mockThingData),
    };

    const response = await POST(request);

    expect(request.headers.get).toHaveBeenCalledWith('x-thingiverse-token');
    expect(mockCreateThing).toHaveBeenCalledWith(mockThingData);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 1, name: 'New Thing' });
  });

  it('should return 401 if access token is missing', async () => {
    const request = {
      headers: {
        get: jest.fn(key => key === 'x-thingiverse-token' ? null : null),
      },
      json: jest.fn(),
    };

    const response = await POST(request);

    expect(request.headers.get).toHaveBeenCalledWith('x-thingiverse-token');
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Missing Thingiverse access token' });
  });

  it('should return 500 on internal server error', async () => {
    const mockCreateThing = jest.fn().mockRejectedValue(new Error('Internal error'));
    ThingiverseAPI.mockImplementation(() => ({ createThing: mockCreateThing }));

    const mockThingData = { name: 'New Thing' };
    const request = {
      headers: {
        get: jest.fn(key => key === 'x-thingiverse-token' ? 'mock-access-token' : null),
      },
      json: jest.fn().mockResolvedValue(mockThingData),
    };

    const response = await POST(request);

    expect(request.headers.get).toHaveBeenCalledWith('x-thingiverse-token');
    expect(mockCreateThing).toHaveBeenCalledWith(mockThingData);

    // Add assertion to verify console.error was called with the expected message
    expect(console.error).toHaveBeenCalledWith(
      'Failed to create Thingiverse thing:',
      expect.any(Error)
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});