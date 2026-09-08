//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

const { createRequire, isBuiltin } = require('node:module')

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
      return {
        found: true,
        path: createRequire(file).resolve(source),
      }
    } catch {
      return { found: false }
    }
  },
}
