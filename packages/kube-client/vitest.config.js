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
    restoreMocks: false,
    clearMocks: true,
    setupFiles: ['./vitest.setup.js'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.js'],
      thresholds: {
        branches: 73,
        functions: 97,
        lines: 94,
        statements: 94,
      },
    },
  },
})
