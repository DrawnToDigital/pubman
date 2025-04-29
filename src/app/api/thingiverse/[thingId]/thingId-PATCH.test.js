// In src/app/api/thingiverse/[thingId]/thingId-PATCH.test.js
import { PATCH } from './route';  // Fix the import path
import { ThingiverseAPI } from '../lib';

jest.mock('../lib', () => ({
  ThingiverseAPI: jest.fn().mockImplementation(() => ({
    updateThing: jest.fn(),
  })),
}));

describe('PATCH /api/thingiverse/[thingId]', () => {
  it('should return 200 and update the thing successfully', async () => {
    const mockUpdateThing = jest.fn().mockResolvedValue({ id: '12345', name: 'Updated Thing' });
    ThingiverseAPI.mockImplementation(() => ({ updateThing: mockUpdateThing }));

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('mock-access-token'),
      },
      json: jest.fn().mockResolvedValue({ name: 'Updated Thing' }),
    };

    const response = await PATCH(request, { params: { thingId: '12345' } });

    expect(mockUpdateThing).toHaveBeenCalledWith('12345', { name: 'Updated Thing' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: '12345', name: 'Updated Thing' });
  });

  it('should return 401 if access token is missing', async () => {
    const request = {
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
      json: jest.fn(),
    };

    const response = await PATCH(request, { params: { thingId: '12345' } });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Missing Thingiverse access token' });
  });

  it('should return 500 on internal server error', async () => {
    const mockUpdateThing = jest.fn().mockRejectedValue(new Error('Internal error'));
    ThingiverseAPI.mockImplementation(() => ({ updateThing: mockUpdateThing }));

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('mock-access-token'),
      },
      json: jest.fn().mockResolvedValue({ name: 'Updated Thing' }),
    };

    const response = await PATCH(request, { params: { thingId: '12345' } });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
    expect(console.error).toHaveBeenCalledWith(
      'Failed to update Thingiverse thing:',
      expect.any(Error)
    );
  });
});