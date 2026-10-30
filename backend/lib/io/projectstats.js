//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import logger from '../logger/index.js'
import * as projectstats from '../services/projectstats.js'
import helper from './helper.js'

const kind = 'ProjectStat'
const allProjectStatsRoom = 'projectstats:all'
const projectStatsNamespaceRoomPrefix = 'projectstats;'
const transitionQueues = new WeakMap()

function getProjectStatNamespaceRoom (namespace) {
  return `${projectStatsNamespaceRoomPrefix}${namespace}`
}

function isProjectStatsRoom (room) {
  return room === allProjectStatsRoom || room.startsWith(projectStatsNamespaceRoomPrefix)
}

function getScopeRooms (projectStatScope) {
  if (projectStatScope.canListAllProjectStats) {
    return new Set([allProjectStatsRoom])
  }
  return new Set(Array.from(projectStatScope.projectStatNamespaces, getProjectStatNamespaceRoom))
}

function getProjectStatScope (socket) {
  const rooms = Array.from(socket.rooms)
  return {
    canListAllProjectStats: rooms.includes(allProjectStatsRoom),
    projectStatNamespaces: new Set(rooms
      .filter(room => room.startsWith(projectStatsNamespaceRoomPrefix))
      .map(room => room.slice(projectStatsNamespaceRoomPrefix.length))),
  }
}

async function replaceProjectStatScope (socket, projectStatScope, user) {
  const currentRooms = new Set(Array.from(socket.rooms).filter(isProjectStatsRoom))
  const desiredRooms = getScopeRooms(projectStatScope)
  const roomsToJoin = Array.from(desiredRooms).filter(room => !currentRooms.has(room))
  const roomsToLeave = Array.from(currentRooms).filter(room => !desiredRooms.has(room))

  if (roomsToJoin.length) {
    logger.debug('User %s joined rooms [%s]', user?.id, roomsToJoin.join(', '))
    await socket.join(roomsToJoin)
  }
  await Promise.all(roomsToLeave.map(room => socket.leave(room)))
}

// Subscription state changes are serialized so an older authorization result cannot restore rooms
// after a completed unsubscribe. Synchronization is read-only and intentionally bypasses this queue.
function enqueueTransition (socket, callback) {
  const previous = transitionQueues.get(socket) ?? Promise.resolve()
  const operation = previous
    .catch(() => {})
    .then(callback)
  transitionQueues.set(socket, operation)
  return operation.finally(() => {
    if (transitionQueues.get(socket) === operation) {
      transitionQueues.delete(socket)
    }
  })
}

function leaveProjectStatsRooms (socket) {
  return Promise.all(Array.from(socket.rooms)
    .filter(isProjectStatsRoom)
    .map(room => socket.leave(room)))
}

function subscribe (socket) {
  return enqueueTransition(socket, async () => {
    const user = helper.getUserFromSocket(socket)
    try {
      const projectStatScope = await projectstats.resolveProjectStatScope(user)
      await replaceProjectStatScope(socket, projectStatScope, user)
      socket.data.projectStatsSubscribed = true
    } catch (err) {
      delete socket.data.projectStatsSubscribed
      await leaveProjectStatsRooms(socket)
      throw err
    }
  })
}

function unsubscribe (socket) {
  return enqueueTransition(socket, async () => {
    delete socket.data.projectStatsSubscribed
    await leaveProjectStatsRooms(socket)
  })
}

const synchronize = helper.derivedResourceSynchronizeFactory(kind, {
  accessResolver (socket) {
    if (!socket.data?.projectStatsSubscribed) {
      return
    }
    return getProjectStatScope(socket)
  },
  getByUids: projectstats.getByUids,
})

export {
  subscribe,
  synchronize,
  unsubscribe,
}
