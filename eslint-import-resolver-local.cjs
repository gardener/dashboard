//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

module.exports = {
  interfaceVersion: 2,
  resolve (source, file, options) {
    const { map: mapEntries = [] } = options
    const map = new Map(mapEntries)
    const found = map.has(source)
    const path = found
      ? map.get(source)
      : undefined
    return { found, path }
  },
}
