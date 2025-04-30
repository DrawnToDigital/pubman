import { GET, POST } from './route';
import { ThingiverseAPI } from '../../thingiverse-lib';

jest.mock('../../thingiverse-lib', () => ({
  ThingiverseAPI: jest.fn().mockImplementation(() => ({
    getFilesForThing: jest.fn(),
    uploadFile: jest.fn(),
  })),
}));

describe('GET /api/thingiverse/[thingId]/files', () => {
  // GET tests remain unchanged
});

describe('POST /api/thingiverse/[thingId]/files', () => {
  it('should return 201 and upload a file successfully', async () => {
    const mockUploadFile = jest.fn().mockResolvedValue({ id: 1, name: 'uploaded-file.stl' });
    ThingiverseAPI.mockImplementation(() => ({ uploadFile: mockUploadFile }));

    // Mock file and FormData
    const mockFile = {
      name: 'test-file.stl',
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    };
    const mockFormData = {
      get: jest.fn((key) => {
        if (key === 'file') return mockFile;
        if (key === 'fileName') return 'custom-filename.stl';
        return null;
      })
    };

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('mock-access-token'),
      },
      formData: jest.fn().mockResolvedValue(mockFormData)
    };

    // Create a proper buffer instead of mocking Buffer globally
    const mockFileBuffer = Buffer.from('test');
    jest.spyOn(Buffer, 'from').mockReturnValue(mockFileBuffer);

    const response = await POST(request, { params: { thingId: '12345' } });

    expect(mockUploadFile).toHaveBeenCalledWith('12345', 'custom-filename.stl', mockFileBuffer);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 1, name: 'uploaded-file.stl' });
  });

  it('should return 400 if no file is provided', async () => {
    // Fix this test to properly simulate a missing file
    const mockFormData = {
      get: jest.fn((key) => null) // Return null for any key including 'file'
    };

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('mock-access-token'),
      },
      formData: jest.fn().mockResolvedValue(mockFormData)
    };

    const response = await POST(request, { params: { thingId: '12345' } });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'No file provided' });
  });

  it('should return 401 if access token is missing', async () => {
    const request = {
      headers: {
        get: jest.fn().mockReturnValue(null),
      }
    };

    const response = await POST(request, { params: { thingId: '12345' } });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Missing Thingiverse access token' });
  });

  it('should return 500 on internal server error', async () => {
    const mockUploadFile = jest.fn().mockRejectedValue(new Error('Internal error'));
    ThingiverseAPI.mockImplementation(() => ({ uploadFile: mockUploadFile }));

    const mockFile = {
      name: 'test-file.stl',
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    };
    const mockFormData = {
      get: jest.fn((key) => key === 'file' ? mockFile : null)
    };

    const request = {
      headers: {
        get: jest.fn().mockReturnValue('mock-access-token'),
      },
      formData: jest.fn().mockResolvedValue(mockFormData)
    };

    const response = await POST(request, { params: { thingId: '12345' } });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
    expect(console.error).toHaveBeenCalledWith(
      'Failed to upload file to Thingiverse:',
      expect.any(Error)
    );
  });
});