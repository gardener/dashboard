module.exports = {
  restoreMocks: true,
  verbose: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'dist/**/*.cjs',
  ],
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/test-ignore/',
  ],
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^\\/]+$',
  ],
  transform: undefined,
  coverageThreshold: {
    global: {
      branches: 68,
      functions: 94,
      lines: 90,
      statements: 90,
    },
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.cjs',
  ],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/__tests__/**/*.cjs',
    '**/?(*.)+(spec|test).js',
    '**/?(*.)+(spec|test).cjs',
  ],
}
