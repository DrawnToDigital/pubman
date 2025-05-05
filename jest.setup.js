// jest.setup.js
import mockConsole from 'jest-mock-console';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      json: async () => data
    }))
  }
}));

// Global test timeout
jest.setTimeout(10000);

// Setup global console mocks
let restoreConsole;

// Mock console.error and console.warn before all tests
beforeAll(() => {
  restoreConsole = mockConsole(['error', 'warn', 'log']);
});

// Clear all mocks before each test globally
beforeEach(() => {
  jest.clearAllMocks();
});

// Restore original console after all tests
afterAll(() => {
  if (restoreConsole) {
    restoreConsole();
  }
});