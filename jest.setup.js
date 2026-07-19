// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      json: async () => data
    }))
  }
}));

// Mock electron-log. Server-side code (API routes, 'use server' actions) uses
// electron-log/node - electron-log/renderer is only correct in actual renderer-process
// code (React components/contexts) and is mocked separately for those.
jest.mock('electron-log/renderer', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('electron-log/node', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

// Global test timeout
jest.setTimeout(10000);

// Clear all mocks before each test globally
beforeEach(() => {
  jest.clearAllMocks();
});