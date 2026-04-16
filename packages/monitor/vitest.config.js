//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['__tests__/**/*.spec.js'],
    globals: true,
    environment: 'node',
    pool: 'vmThreads',
    restoreMocks: true,
    clearMocks: true,
    setupFiles: ['./vitest.setup.js'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.js'],
      exclude: ['lib/index.js'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
})
