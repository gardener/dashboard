//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

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
      functions: 93,
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
  moduleNameMapper: {
    '^\\.{2}/markdown(\\.cjs)?$': '<rootDir>/__mocks__/@gardener-dashboard/markdown.cjs',
  },
}
