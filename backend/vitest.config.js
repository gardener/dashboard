//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// eslint-disable-next-line import/no-unresolved
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['**/__tests__/**/*.spec.js'],
    exclude: [
      '**/__tests__/**/*.spec.cjs',  // Exclude Jest tests
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
})
