//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

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
