//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
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
    restoreMocks: false,
    clearMocks: true,
    setupFiles: ['./vitest.setup.js'],
    testTimeout: 30000,
  },
})
