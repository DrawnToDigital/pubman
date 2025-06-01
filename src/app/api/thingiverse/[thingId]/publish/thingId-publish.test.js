import {POST} from './route';
import {ThingiverseAPI} from '../../thingiverse-lib';
import {getDatabase} from "../../../../lib/betterSqlite3";
import log from 'electron-log/renderer';

// Mock dependencies
jest.mock('../../thingiverse-lib');
jest.mock('../../../../lib/betterSqlite3');

describe('POST /api/thingiverse/[thingId]/publish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if access token is missing', async () => {
    const request = {
      headers: {
        get: jest.fn().mockReturnValue(null)
      }
    };
    const params = {thingId: '12345'};

    const response = await POST(request, {params});

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({error: 'Missing Thingiverse access token'});
  });

  it('should return 404 if design not found in database', async () => {
    // Mock Thingiverse API
    const mockPublishResult = {success: true};
    const mockPublishThing = jest.fn().mockResolvedValue(mockPublishResult);

    ThingiverseAPI.mockImplementation(() => ({
      publishThing: mockPublishThing
    }));

    // Mock database to return no design
    const mockGet = jest.fn().mockReturnValue(null);
    const mockPrepare = jest.fn().mockReturnValue({
      get: mockGet
    });

    getDatabase.mockReturnValue({
      prepare: mockPrepare
    });

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('token123')
      }
    };
    const params = {thingId: '12345'};

    const response = await POST(request, {params});
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBe('Design not found in database');
    expect(responseData.thingiverseResult).toEqual(mockPublishResult);

    // Verify API was called
    expect(mockPublishThing).toHaveBeenCalledWith('12345');
  });

  it('should publish the thing and update the database', async () => {
    // Mock Thingiverse API
    const mockPublishResult = {success: true};
    const mockPublishThing = jest.fn().mockResolvedValue(mockPublishResult);

    ThingiverseAPI.mockImplementation(() => ({
      publishThing: mockPublishThing
    }));

    // Mock database operations
    const mockDesignPlatform = {design_id: '42'};
    const mockGetDesignPlatform = jest.fn().mockReturnValue(mockDesignPlatform);

    const mockUpdateResult = {changes: 1};
    const mockRun = jest.fn().mockReturnValue(mockUpdateResult);

    const mockUpdatedRecord = {
      design_id: '42',
      published_status: 2,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      published_at: '2023-01-01T00:00:00.000Z'
    };
    const mockGetUpdatedRecord = jest.fn().mockReturnValue(mockUpdatedRecord);

    const mockPrepare = jest.fn().mockImplementation((query) => {
      if (query.includes('SELECT design_id')) {
        return {get: mockGetDesignPlatform};
      } else if (query.includes('UPDATE design_platform')) {
        return {run: mockRun};
      } else {
        return {get: mockGetUpdatedRecord};
      }
    });

    getDatabase.mockReturnValue({
      prepare: mockPrepare
    });

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('token123')
      }
    };
    const params = {thingId: '12345'};

    const response = await POST(request, {params});
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.message).toBe('Thing published successfully');
    expect(responseData.thingiverseResult).toEqual(mockPublishResult);
    expect(responseData.databaseUpdate.success).toBe(true);
    expect(responseData.databaseUpdate.record).toEqual(mockUpdatedRecord);

    // Verify API was called
    expect(mockPublishThing).toHaveBeenCalledWith('12345');

    // Verify database operations
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT design_id'));
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE design_platform'));
    expect(mockRun).toHaveBeenCalledWith(2, 3, '42');
  });

  it('should handle API errors', async () => {
    // Mock Thingiverse API to throw an error
    const mockError = new Error('API Error');
    const mockPublishThing = jest.fn().mockRejectedValue(mockError);

    ThingiverseAPI.mockImplementation(() => ({
      publishThing: mockPublishThing
    }));

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('token123')
      }
    };
    const params = {thingId: '12345'};

    const response = await POST(request, {params});

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({error: 'Internal server error'});
    expect(log.error).toHaveBeenCalledWith('Failed to publish Thingiverse thing:', mockError);
  });
});