//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.spec.js'],
    globals: true,
    environment: 'node',
    pool: 'vmThreads',
    restoreMocks: false,
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
