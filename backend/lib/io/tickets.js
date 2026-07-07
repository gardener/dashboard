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
  const allowedProjects = cache.getProjects().filter(projectFilter(user, canListProjects))

  if (namespace === '_all') {
    await Promise.all(allowedProjects.map(project => joinRoom(socket, project.spec.namespace)))
    return
  }

  const project = allowedProjects.find(proj => proj.spec.namespace === namespace)
  if (!project) {
    throw createError(403, `Forbidden to subscribe to tickets in namespace ${namespace}`)
  }
  await joinRoom(socket, namespace, shootName)
}

export async function unsubscribe (socket) {
  const rooms = [...socket.rooms].filter(room => room.startsWith('issues;'))
  await Promise.all(rooms.map(room => socket.leave(room)))
}
