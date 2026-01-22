//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// TODO(esm-migration): This file exists ONLY to support CommonJS callers (e.g. backend test suite using require()).
// CommonJS cannot require() ESM modules (ERR_REQUIRE_ESM), so we load the real implementation via dynamic import().
// Once the backend/test suite is migrated to ESM, delete this adapter file and import markdown.engine.mjs directly.

// TODO(esm-migration): After moving tests/runtime to ESM:
//  - remove this CJS wrapper (markdown.js)
//  - update package.json "exports"/"main" to point at ./markdown.engine.mjs (or rename engine file accordingly)
//  - replace all require('./markdown') usage with import { ... } from './markdown.engine.mjs'

let enginePromise

async function getConverter () {
  if (!enginePromise) {
    enginePromise = (async () => {
      const module = await import('./markdown.engine.mjs')
      return module.createConverter()
    })()
  }
  return enginePromise
}

export function createConverter () {
  return {
    async makeSanitizedHtml (text) {
      const c = await getConverter()
      return c.makeSanitizedHtml(text)
    },
  }
}
