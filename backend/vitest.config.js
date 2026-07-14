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
    pool: 'threads',
    restoreMocks: false,
    clearMocks: true,
    setupFiles: ['./vitest.setup.js'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.js'],
      thresholds: {
        branches: 68,
        functions: 93,
        lines: 89,
        statements: 89,
      },
    },
  },
})
