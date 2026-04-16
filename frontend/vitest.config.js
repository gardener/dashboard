//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineConfig,
  mergeConfig,
} from 'vitest/config'

import viteConfig from './vite.config.js'

export default mergeConfig(
  viteConfig({ command: 'serve', mode: 'test' }),
  defineConfig({
    test: {
      include: ['__tests__/**/*.spec.js'],
      globals: true,
      environment: 'jsdom',
      clearMocks: true,
      setupFiles: [
        'vitest.setup.js',
      ],
      server: {
        deps: {
          inline: [
            'vuetify',
          ],
        },
      },
      coverage: {
        provider: 'v8',
        exclude: ['**/__fixtures__/**'],
        all: false,
        thresholds: {
          statements: 74,
          branches: 80,
          functions: 47,
          lines: 74,
        },
      },
    },
  }),
)
