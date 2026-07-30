//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  root: repositoryRoot,
  test: {
    include: ['hack/local-dashboard/test/**/*.spec.js'],
    globals: false,
    environment: 'node',
    clearMocks: true,
    setupFiles: [],
    coverage: {
      provider: 'v8',
      include: [
        'hack/local-dashboard.mjs',
        'hack/local-dashboard/internal/**/*.mjs',
      ],
      reportsDirectory: 'coverage/local-dashboard',
      thresholds: {
        statements: 47,
        branches: 58,
        functions: 56,
        lines: 47,
      },
    },
  },
})
