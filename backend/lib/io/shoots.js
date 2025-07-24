//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import createError from 'http-errors'
import logger from '../logger/index.js'
import cache from '../cache/index.js'
import {
  projectFilter,
  parseRooms,
} from '../utils/index.js'
import services from '../services/index.js'
import helper from './helper.js'
const { authorization } = services

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

async function subscribe (socket, { namespace, name, labelSelector }) {
  const user = helper.getUserFromSocket(socket)

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

function unsubscribe (socket) {
  const promises = Array.from(socket.rooms)
    .filter(room => room !== socket.id && room.startsWith('shoots'))
    .map(room => socket.leave(room))
  return Promise.all(promises)
}

const synchronize = helper.synchronizeFactory('Shoot', {
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
      return helper.constants.OBJECT_ORIGINAL
    } else if (isAdmin || namespaces.includes(namespace)) {
      return helper.constants.OBJECT_SIMPLE
    }
    return helper.constants.OBJECT_NONE
  },
})

export {
  subscribe,
  unsubscribe,
  synchronize,
}
