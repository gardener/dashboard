//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import createError from 'http-errors'
import logger from '../logger/index.js'
import helper from './helper.js'
import * as seedstats from '../services/seedstats.js'

const { getUserFromSocket } = helper

const group = 'dashboard.gardener.cloud'
const kind = 'SeedStat'
const listRoomRegExp = /^seedstats;uf=(?<mask>[0-7])$/
const seedRoomRegExp = /^seedstats;seed=(?<seedName>[^;]+);uf=(?<mask>[0-7])$/

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

function isSeedStatsRoom (room) {
  return listRoomRegExp.test(room) || seedRoomRegExp.test(room)
}

function parseRoomName (room) {
  const listMatch = listRoomRegExp.exec(room)
  if (listMatch) {
    const { mask } = listMatch.groups
    return {
      room,
      unhealthyFilterMask: Number(mask),
    }
  }

  const seedMatch = seedRoomRegExp.exec(room)
  if (seedMatch) {
    const { seedName, mask } = seedMatch.groups
    return {
      room,
      seedName,
      unhealthyFilterMask: Number(mask),
    }
  }

  throw new TypeError(`Invalid seedstats room: ${room}`)
}

function getJoinedRooms (nsp, { seedName } = {}) {
  const adapterRooms = nsp?.adapter?.rooms
  if (!adapterRooms) {
    return []
  }

  const appliesToSeed = ({ seedName: roomSeedName }) => !roomSeedName || roomSeedName === seedName
  return Array.from(adapterRooms.keys())
    .filter(isSeedStatsRoom)
    .map(parseRoomName)
    .filter(appliesToSeed)
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
    .filter(room => isSeedStatsRoom(room))
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
