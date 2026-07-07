//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import createError from 'http-errors'
import cache from '../cache/index.js'
import * as authorization from '../services/authorization.js'
import helper from './helper.js'
import { projectFilter } from '../utils/index.js'

function joinRoom (socket, namespace, shootName) {
  if (shootName) {
    return socket.join(`issues;${namespace}/${shootName}`)
  }
  return socket.join(`issues;${namespace}`)
}

export async function subscribe (socket, { namespace, shootName } = {}) {
  const user = helper.getUserFromSocket(socket)
  const canListProjects = await authorization.canListProjects(user)

  if (namespace === '_all') {
    const projects = cache.getProjects().filter(projectFilter(user, canListProjects))
    await Promise.all(projects.map(project => joinRoom(socket, project.spec.namespace)))
    return
  }

  const project = cache.findProjectByNamespace(namespace)
  if (!projectFilter(user, canListProjects)(project)) {
    throw createError(403, 'Insufficient authorization for ticket subscription')
  }
  await joinRoom(socket, namespace, shootName)
}

export async function unsubscribe (socket) {
  const rooms = [...socket.rooms].filter(room => room.startsWith('issues;'))
  await Promise.all(rooms.map(room => socket.leave(room)))
}
