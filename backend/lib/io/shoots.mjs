//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import httpErrors from 'http-errors'
import logger from '../logger/index.js'
import cache from '../cache/index.js'
import { projectFilter, parseRooms } from '../utils/index.js'
import services from '../services/index.mjs'
import { constants, getUserFromSocket, synchronizeFactory } from './helper.mjs'
const { authorization } = services
const { NotFound, createError } = httpErrors

async function canListAllShoots (user, namespaces) {
  const canListShoots = async namespace => [namespace, await authorization.canListShoots(user, namespace)]
  const results = await Promise.all(namespaces.map(canListShoots))
  for (const [namespace, allowed] of results) {
    if (!allowed) {
      logger.error('User %s has no authorization to subscribe shoots in namespace %s', user.id, namespace)
      return false
    }
  }
  return true
}

function getAllNamespaces (user) {
  return cache.getProjects()
    .filter(projectFilter(user, false))
    .map(project => project.spec.namespace)
}

export async function subscribe (socket, { namespace, name, labelSelector }) {
  const user = getUserFromSocket(socket)

  const joinRoom = room => {
    logger.debug('User %s joined rooms [%s]', user.id, room)
    return socket.join(room)
  }

  if (namespace && name) {
    if (await authorization.canGetShoot(user, namespace, name)) {
      return joinRoom(`shoots;${namespace}/${name}`)
    }
  } else if (namespace !== '_all') {
    if (await authorization.canListShoots(user, namespace)) {
      return joinRoom(`shoots;${namespace}`)
    }
  } else {
    let room = 'shoots'
    if (labelSelector === 'shoot.gardener.cloud/status!=healthy') {
      room += ':unhealthy'
    }
    if (await authorization.isAdmin(user)) {
      return joinRoom(room + ':admin')
    }
    const namespaces = getAllNamespaces(user)
    if (await canListAllShoots(user, namespaces)) {
      const rooms = namespaces.map(namespace => room + `;${namespace}`)
      return joinRoom(rooms)
    }
  }
  throw createError(403, 'Insufficient authorization for shoot subscription')
}

export function unsubscribe (socket) {
  const promises = Array.from(socket.rooms)
    .filter(room => room !== socket.id && room.startsWith('shoots'))
    .map(room => socket.leave(room))
  return Promise.all(promises)
}

export const synchronize = synchronizeFactory('Shoot', {
  accessResolver (socket, object) {
    const rooms = Array.from(socket.rooms).filter(room => room !== socket.id)
    const [
      isAdmin,
      namespaces,
      qualifiedNames,
    ] = parseRooms(rooms)

    const { namespace, name } = object.metadata
    const qualifiedName = [namespace, name].join('/')
    if (qualifiedNames.includes(qualifiedName)) {
      return constants.OBJECT_ORIGINAL
    } else if (isAdmin || namespaces.includes(namespace)) {
      return constants.OBJECT_SIMPLE
    }
    return constants.OBJECT_NONE
  },
})
