//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

const fs = require('node:fs')
const { isBuiltin } = require('node:module')

const pnpapi = require('pnpapi')

const packageRequestRegExp = /^(?![a-zA-Z]:[\\/]|\\\\|\.{0,2}(?:\/|$))((?:@[^/]+\/)?[^/]+)\/*(.*|)$/
const conditions = new Set(['node', 'import', 'module-sync', 'node-addons'])

function allowsLegacyResolution (source, file) {
  const match = source.match(packageRequestRegExp)
  if (!match) {
    return false
  }

  const [, dependencyName, subPath] = match
  if (subPath || dependencyName === 'pnpapi') {
    return false
  }

  const packageJsonPath = pnpapi.resolveToUnqualified(`${dependencyName}/package.json`, file)
  if (!packageJsonPath) {
    return false
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  return packageJson.exports == null
}

module.exports = {
  interfaceVersion: 2,
  resolve (source, file, options = {}) {
    const { map: mapEntries = [] } = options
    const map = new Map(mapEntries)

    if (map.has(source)) {
      return {
        found: true,
        path: map.get(source),
      }
    }

    if (isBuiltin(source)) {
      return {
        found: true,
        path: null,
      }
    }

    try {
      const extensions = allowsLegacyResolution(source, file)
        ? undefined
        : []
      const path = pnpapi.resolveRequest(source, file, {
        conditions,
        extensions,
      })

      return {
        found: path !== null,
        path,
      }
    } catch {
      return { found: false }
    }
  },
}
