/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',

  // Transform files with babel
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/flash-list|@tanstack/react-query|zustand|phosphor-react-native|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|date-fns|date-fns-tz|zod|axios|msw|@mswjs|until-async)',
  ],

  // Setup files (run before test framework is installed)
  setupFiles: ['<rootDir>/src/test/polyfills.ts'],

  // Setup files (run after test framework is installed)
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/src/test/setup.ts',
  ],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/src/test/$1',
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
    '^@mswjs/interceptors/(.*)$': '<rootDir>/node_modules/@mswjs/interceptors/$1',
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],

  // Ignore test utility files
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/__tests__/utils.tsx',
    '<rootDir>/src/__tests__/mocks/',
    '<rootDir>/src/test/',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/__tests__/**/*',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!**/node_modules/**',
    '!src/theme/**/*',
    '!src/**/index.ts',
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Higher thresholds for critical modules
    './src/hooks/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/utils/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },

  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],

  // Test environment
  testEnvironment: 'jsdom',

  // Timeout for async tests
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Jest junit reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
      },
    ],
  ],
};
