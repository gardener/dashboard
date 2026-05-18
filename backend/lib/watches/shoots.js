//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shootHasIssue } from '../utils/index.js'
import cache from '../cache/index.js'
import { getJoinedRooms } from '../io/seedstats.js'
import { shouldCountAsUnhealthy } from '../services/seedstats.js'

export default (io, informer, options) => {
  const nsp = io.of('/')
  const { shootsWithIssues = new Set() } = options ?? {}

  const publishShoots = event => {
    const { type, object } = event
    const { namespace, name, uid } = object.metadata
    const rooms = [
      'shoots:admin',
      `shoots;${namespace}`,
      `shoots;${namespace}/${name}`,
    ]
    nsp.to(rooms).emit('shoots', { type, uid })
  }

  const publishUnhealthyShoots = event => {
    let type = event.type
    const object = event.object
    const { namespace, uid } = object.metadata

    if (shootHasIssue(object)) {
      if (!shootsWithIssues.has(uid)) {
        shootsWithIssues.add(uid)
      } else if (type === 'DELETED') {
        shootsWithIssues.delete(uid)
      }
    } else if (shootsWithIssues.has(uid)) {
      type = 'DELETED'
      shootsWithIssues.delete(uid)
    } else {
      return
    }
    const rooms = [
      'shoots:unhealthy:admin',
      `shoots:unhealthy;${namespace}`,
    ]
    nsp.to(rooms).emit('shoots', { type, uid })
  }

  const publishManagedSeedShoots = event => {
    const { type, object } = event
    const { namespace, name, uid } = object.metadata
    if (namespace !== 'garden') {
      return
    }
    if (type !== 'DELETED') {
      const managedSeed = cache.getManagedSeedForShootInGardenNamespace(name)
      if (!managedSeed) {
        return
      }
    }
    // Always emit DELETED events without consulting the managedSeed cache:
    // the ManagedSeed may already be gone when the shoot delete arrives.
    // This is safe because the managedSeed shoot reference is immutable and
    // deleting an unknown UID is a no-op for the frontend
    nsp.to('managedseed-shoots;garden').emit('managedseed-shoots', { type, uid })
  }

  const publishSeedStats = event => {
    const { object, oldObject } = event
    const oldSeedName = oldObject?.spec?.seedName
    const newSeedName = object?.spec?.seedName
    const affectedSeedNames = new Set([oldSeedName, newSeedName].filter(Boolean))

    for (const seedName of affectedSeedNames) {
      const seedUid = cache.getSeed(seedName)?.metadata?.uid
      if (!seedUid) {
        continue
      }

      const joinedRooms = getJoinedRooms(nsp, { seedName })
      for (const { room, unhealthyFilterMask } of joinedRooms) {
        if (!shouldEmitSeedStatsEvent(event, { unhealthyFilterMask })) {
          continue
        }
        nsp.to(room).emit('seedstats', { type: 'MODIFIED', uid: seedUid })
      }
    }
  }

  const handleEvent = event => {
    publishShoots(event)
    publishUnhealthyShoots(event)
    publishManagedSeedShoots(event)
    publishSeedStats(event)
  }

  informer.on('add', object => handleEvent({ type: 'ADDED', object }))
  informer.on('update', (object, oldObject) => handleEvent({ type: 'MODIFIED', object, oldObject }))
  informer.on('delete', object => handleEvent({ type: 'DELETED', object, oldObject: object }))
}

function shouldEmitSeedStatsEvent (event, { unhealthyFilterMask }) {
  const { type, object, oldObject } = event
  const oldSeedName = oldObject?.spec?.seedName
  const newSeedName = object?.spec?.seedName

  switch (type) {
    case 'ADDED':
    case 'DELETED':
      return true
    case 'MODIFIED': {
      const seedChanged = oldSeedName !== newSeedName
      if (seedChanged) {
        return true
      }
      return didShootHealthStateChange(oldObject, object, unhealthyFilterMask)
    }
    default:
      return false
  }
}

function didShootHealthStateChange (oldObject, newObject, unhealthyFilterMask) {
  const hadIssueBefore = shootHasIssue(oldObject)
  const hasIssueNow = shootHasIssue(newObject)

  if (hadIssueBefore !== hasIssueNow) {
    return true
  }

  return shouldCountAsUnhealthy(oldObject, unhealthyFilterMask) !==
    shouldCountAsUnhealthy(newObject, unhealthyFilterMask)
}
