//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const resolver = require('../../../eslint-import-resolver-local.cjs')
const importer = fileURLToPath(new URL('../lib/index.js', import.meta.url))

describe('eslint-import-resolver-local', () => {
  it('should select the ESM conditional export', () => {
    const result = resolver.resolve('vitest/config', importer)

    expect(result.found).toBe(true)
    expect(result.path).toMatch(/[\\/]vitest[\\/]dist[\\/]config\.js$/)
  })

  it('should require extensions for relative ESM imports', () => {
    expect(resolver.resolve('./Client', importer)).toEqual({ found: false })
    expect(resolver.resolve('./Client.js', importer)).toEqual({
      found: true,
      path: fileURLToPath(new URL('../lib/Client.js', import.meta.url)),
    })
  })
})
