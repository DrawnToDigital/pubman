import {POST} from './route';
import {ThingiverseAPI} from '../thingiverse-lib';
import {getDatabase} from "../../../lib/betterSqlite3";
import fs from 'fs';

// Mock dependencies
jest.mock('../thingiverse-lib');
jest.mock('../../../lib/betterSqlite3');
jest.mock('fs');

describe('POST /api/thingiverse/things', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new thing and record it in the design_platform table', async () => {
    // Mock Thingiverse API
    const mockNewThing = {id: 12345, name: 'New Thing'};
    const mockCreateThing = jest.fn().mockResolvedValue(mockNewThing);
    const mockUploadFile = jest.fn().mockResolvedValue({success: true});

    ThingiverseAPI.mockImplementation(() => ({
      createThing: mockCreateThing,
      uploadFile: mockUploadFile
    }));

    // Important: Use mockImplementation instead of direct assignment
    fs.readFileSync.mockImplementation(() => Buffer.from('file content'));

    // Mock database operations
    const mockRunResult = {lastInsertRowid: 1};
    const mockRun = jest.fn().mockReturnValue(mockRunResult);
    const mockGet = jest.fn().mockReturnValue({
      designId: '42',
      published_status: 1,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z'
    });
    const mockPrepare = jest.fn().mockReturnValue({
      run: mockRun,
      get: mockGet
    });

    getDatabase.mockReturnValue({
      prepare: mockPrepare
    });

    // Create request with mock data
    const mockDesignData = {
      main_name: 'Test Design',
      description: 'Test Description',
      license_key: 'cc-by',
      thingiverse_category: 'Art',
      tags: [{tag: 'test1'}, {tag: 'test2'}],
      assets: [
        // Use a simpler path format that matches the local:// prefix exactly
        {url: 'local://tmp/file.stl', file_name: 'file.stl'}
      ]
    };

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('token123')
      },
      json: jest.fn().mockResolvedValue({
        designId: '42',
        designData: mockDesignData
      })
    };

    const response = await POST(request);
    const responseData = await response.json();

    // Verify the response
    expect(response.status).toBe(201);
    expect(responseData.message).toBe('Design published to Thingiverse as draft');
    expect(responseData.thingiverseId).toBe(12345);
    expect(responseData.thingiverseUrl).toBe('https://www.thingiverse.com/thing:12345');

    // Verify API calls
    expect(mockCreateThing).toHaveBeenCalledWith({
      name: 'Test Design',
      description: 'Test Description',
      license: 'cc-by',
      category: 'Art',
      tags: ['test1', 'test2'],
      instructions: ''
    });

    // This is the failing expectation
    expect(mockUploadFile).toHaveBeenCalledWith(12345, 'file.stl', expect.any(Buffer));

    // Verify database operations
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO design_platform'));
    expect(mockRun).toHaveBeenCalledWith(3, '42', '12345', 1);
  });
});