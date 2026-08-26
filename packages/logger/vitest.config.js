//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['__tests__/**/*.spec.js'],
    globals: true,
    environment: 'node',
    pool: 'threads',
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.js'],
      thresholds: {
        branches: 69,
        functions: 100,
        lines: 96,
        statements: 96,
      },
    },
  },
})
