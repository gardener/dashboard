//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

let cachedModule
let cachedConverter

async function getConverter () {
  if (!cachedConverter) {
    if (!cachedModule) cachedModule = await import('./markdown.engine.mjs')
    cachedConverter = cachedModule.createConverter()
  }
  return cachedConverter
}

export function createConverter () {
  return {
    async makeSanitizedHtml (text) {
      const c = await getConverter()
      return c.makeSanitizedHtml(text)
    },
  }
}
