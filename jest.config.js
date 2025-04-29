module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};