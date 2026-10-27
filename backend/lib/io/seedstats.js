//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import createError from 'http-errors'
import logger from '../logger/index.js'
import helper from './helper.js'
import * as seedstats from '../services/seedstats.js'
import { ALL_UNHEALTHY_FILTER_FLAGS } from '../services/shootClassification.js'

const { getUserFromSocket } = helper

const group = 'dashboard.gardener.cloud'
const kind = 'SeedStat'
const unhealthyFilterMasks = Array.from({ length: ALL_UNHEALTHY_FILTER_FLAGS + 1 }, (_, mask) => mask)

function notFound (uid) {
  return {
    kind: 'Status',
    apiVersion: 'v1',
    status: 'Failure',
    message: `${kind} with uid ${uid} does not exist`,
    reason: 'NotFound',
    details: {
      uid,
      group,
      kind,
    },
    code: 404,
  }
}

function getListRoomName (unhealthyFilterMask) {
  unhealthyFilterMask = seedstats.parseUnhealthyFilterMask(unhealthyFilterMask)
  return `seedstats;uf=${unhealthyFilterMask}`
}

function getSeedRoomName (seedName, unhealthyFilterMask) {
  unhealthyFilterMask = seedstats.parseUnhealthyFilterMask(unhealthyFilterMask)
  return `seedstats;seed=${seedName};uf=${unhealthyFilterMask}`
}

function getRoomName ({ seedName, unhealthyFilterMask }) {
  if (seedName) {
    return getSeedRoomName(seedName, unhealthyFilterMask)
  }
  return getListRoomName(unhealthyFilterMask)
}

function getJoinedRooms (nsp, { seedName }) {
  if (!seedName) {
    logger.warn('getJoinedRooms called without seedName')
    return []
  }

  const adapterRooms = nsp?.adapter?.rooms
  if (!adapterRooms) {
    return []
  }

  const rooms = []
  for (const unhealthyFilterMask of unhealthyFilterMasks) {
    for (const room of [
      getListRoomName(unhealthyFilterMask),
      getSeedRoomName(seedName, unhealthyFilterMask),
    ]) {
      if (adapterRooms.has(room)) {
        rooms.push({ room, unhealthyFilterMask })
      }
    }
  }
  return rooms
}

function hasSeedStatsAccess (user) {
  return user?.profiles?.canListSeeds === true && user?.profiles?.canListShoots === true
}

async function subscribe (socket, options = {}) {
  const user = getUserFromSocket(socket)

  if (!hasSeedStatsAccess(user)) {
    throw createError(403, 'Insufficient authorization for seedstats subscription')
  }

  const unhealthyFilterMask = seedstats.parseUnhealthyFilterMask(options.unhealthyFilterMask)
  const room = getRoomName({
    seedName: options.name,
    unhealthyFilterMask,
  })
  logger.debug('User %s joined room [%s]', user.id, room)
  return socket.join(room)
}

function unsubscribe (socket) {
  const promises = Array.from(socket.rooms)
    .filter(room => room.startsWith('seedstats;'))
    .map(room => socket.leave(room))
  return Promise.all(promises)
}

async function synchronize (socket, uids = [], options = {}) {
  const user = getUserFromSocket(socket)
  const unhealthyFilterMask = seedstats.parseUnhealthyFilterMask(options.unhealthyFilterMask)

  if (!hasSeedStatsAccess(user)) {
    return uids.map(uid => notFound(uid))
  }

  return seedstats.getByUids(uids, unhealthyFilterMask).map((stat, i) => stat ?? notFound(uids[i])) // eslint-disable-line security/detect-object-injection -- i is the map index
}

export {
  getJoinedRooms,
  subscribe,
  unsubscribe,
  synchronize,
}
