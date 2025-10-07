//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

/**
 * Vite plugin to create a virtual module exposing Material Design Icons (MDI) metadata,
 * including icon names and aliases, derived from '@mdi/svg/meta.json'.
 *
 * This plugin loads the metadata during the build start phase and generates
 * exportable constants for names and aliases in a virtual module.
 */

const VIRTUAL_ID = 'virtual:g-mdi-meta'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

export function mdiMeta () {
  let code = null

  function buildCodeFrom (meta) {
    if (!Array.isArray(meta)) {
      throw new Error('Invalid metadata format: expected an array.')
    }
    // Normalize everything to lowercase once.
    const names = meta.map(i => `mdi-${String(i.name).toLowerCase()}`)
    const aliasEntries = meta
      .filter(i => Array.isArray(i.aliases) && i.aliases.length > 0)
      .map(i => [
        `mdi-${String(i.name).toLowerCase()}`,
        i.aliases.map(a => `mdi-${String(a).toLowerCase()}`),
      ])

    // Emit JS that constructs a Map in the virtual module.
    return `
      export const names = ${JSON.stringify(names)};
      export const aliasMap = new Map(${JSON.stringify(aliasEntries)});
    `
  }

  return {
    name: 'g-mdi-meta',
    enforce: 'pre',
    async buildStart () {
      try {
        const mod = await import('@mdi/svg/meta.json', { with: { type: 'json' } })
        code = buildCodeFrom(mod.default)
      } catch (err) {
        this.error(`[g-mdi-meta] Failed to load @mdi/svg/meta.json: ${err?.message || err}`)
      }
    },
    resolveId (id) {
      if (id !== VIRTUAL_ID) return null
      return RESOLVED_VIRTUAL_ID
    },
    load (id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null
      if (code == null) {
        this.error('[g-mdi-meta] Module requested before initialization')
        return null
      }
      return code
    },
  }
}
