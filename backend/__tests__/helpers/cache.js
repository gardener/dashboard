//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import cache from '../../lib/cache/index.js'

function seedProjectNamespaceIndex (projects = fixtures.projects.list()) {
  const handlers = new Map()
  cache.indexProjectsByNamespace({
    on (event, handler) {
      handlers.set(event, handler)
    },
  })
  const add = handlers.get('add')
  for (const project of projects) {
    add(project)
  }
}

export {
  seedProjectNamespaceIndex,
}
