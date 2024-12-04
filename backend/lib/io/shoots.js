//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const createError = require('http-errors')
const cache = require('../cache')
const logger = require('../logger')
const { projectFilter, trimObjectMetadata, parseRooms } = require('../utils')
const { authorization } = require('../services')
const { getUserFromSocket } = require('./helper')

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

function unsubscribe (socket) {
  const promises = Array.from(socket.rooms)
    .filter(room => room !== socket.id && room.startsWith('shoots'))
    .map(room => socket.leave(room))
  return Promise.all(promises)
}

function synchronize (socket, uids = []) {
  const rooms = Array.from(socket.rooms).filter(room => room !== socket.id)
  const [
    isAdmin,
    namespaces,
    qualifiedNames,
  ] = parseRooms(rooms)

  const uidNotFound = uid => {
    return {
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      message: `Shoot with uid ${uid} does not exist`,
      reason: 'NotFound',
      details: {
        uid,
        group: 'core.gardener.cloud',
        kind: 'shoots',
      },
      code: 404,
    }
  }
  return uids.map(uid => {
    const object = cache.getShootByUid(uid)
    if (!object) {
      // the shoot has been removed from the cache
      return uidNotFound(uid)
    }
    const { namespace, name } = object.metadata
    const qualifiedName = [namespace, name].join('/')
    const hasValidSubscription = isAdmin || namespaces.includes(namespace) || qualifiedNames.includes(qualifiedName)
    if (!hasValidSubscription) {
      // the socket has NOT joined a room (admin, namespace or individual shoot) the current shoot belongs to
      return uidNotFound(uid)
    }
    // only send all shoot details for single shoot subscriptions
    if (!qualifiedNames.includes(qualifiedName)) {
      const clonedObject = _.cloneDeep(object)
      trimObjectMetadata(clonedObject)
      return clonedObject
    }
    return object
  })
}

module.exports = {
  subscribe,
  unsubscribe,
  synchronize,
}
