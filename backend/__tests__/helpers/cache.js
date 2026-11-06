//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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

function seedShootNamespaceIndex (shoots = fixtures.shoots.list()) {
  const handlers = new Map()
  cache.indexShootsByNamespace({
    on (event, handler) {
      handlers.set(event, handler)
    },
  })
  const add = handlers.get('add')
  for (const shoot of shoots) {
    add(shoot)
  }
}

export {
  seedProjectNamespaceIndex,
  seedShootNamespaceIndex,
}
