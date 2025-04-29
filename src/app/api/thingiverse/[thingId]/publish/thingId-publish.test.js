import { POST } from './route';
import { ThingiverseAPI } from '../../lib';

jest.mock('../../lib', () => ({
  ThingiverseAPI: jest.fn().mockImplementation(() => ({
    publishThing: jest.fn(),
  })),
}));

describe('POST /api/thingiverse/[thingId]/publish', () => {
  it('should return 200 and publish the thing successfully', async () => {
    const mockPublishThing = jest.fn().mockResolvedValue({ success: true });
    ThingiverseAPI.mockImplementation(() => ({ publishThing: mockPublishThing }));

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('mock-access-token'),
      },
      params: { thingId: '12345' },
    };

    const response = await POST(request, { params: { thingId: '12345' } });

    expect(mockPublishThing).toHaveBeenCalledWith('12345');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it('should return 401 if access token is missing', async () => {
    const request = {
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
      params: { thingId: '12345' },
    };

    const response = await POST(request, { params: { thingId: '12345' } });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Missing Thingiverse access token' });
  });

  it('should return 500 on internal server error', async () => {
    const mockPublishThing = jest.fn().mockRejectedValue(new Error('Internal error'));
    ThingiverseAPI.mockImplementation(() => ({ publishThing: mockPublishThing }));

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('mock-access-token'),
      },
      params: { thingId: '12345' },
    };

    const response = await POST(request, { params: { thingId: '12345' } });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});