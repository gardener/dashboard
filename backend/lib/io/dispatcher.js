//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  subscribe as subscribeShoots,
  unsubscribe as unsubscribeShoots,
  synchronize as synchronizeShoots,
} from './shoots.js'
import { synchronize as synchronizeProjects } from './projects.js'
import { synchronize as synchronizeSeeds } from './seeds.js'
import {
  subscribe as subscribeSeedStats,
  unsubscribe as unsubscribeSeedStats,
  synchronize as synchronizeSeedStats,
} from './seedstats.js'
import { synchronize as synchronizeManagedSeeds } from './managedseeds.js'
import { synchronize as synchronizeManagedSeedShoots } from './managedseedshoots.js'

async function subscribe (socket, key, options = {}) {
  switch (key) {
    case 'shoots':
      await unsubscribeShoots(socket)
      return subscribeShoots(socket, options)
    case 'seedstats':
      await unsubscribeSeedStats(socket)
      return subscribeSeedStats(socket, options)
    default:
      throw new TypeError(`Invalid subscription type - ${key}`)
  }
}

async function unsubscribe (socket, key) {
  switch (key) {
    case 'shoots':
      return unsubscribeShoots(socket)
    case 'seedstats':
      return unsubscribeSeedStats(socket)
    default:
      throw new TypeError(`Invalid subscription type - ${key}`)
  }
}

function synchronize (socket, key, ...args) {
  switch (key) {
    case 'shoots': {
      const [uids] = args
      assertArray(uids)
      return synchronizeShoots(socket, uids)
    }
    case 'projects': {
      const [uids] = args
      assertArray(uids)
      return synchronizeProjects(socket, uids)
    }
    case 'seeds': {
      const [uids] = args
      assertArray(uids)
      return synchronizeSeeds(socket, uids)
    }
    case 'seedstats': {
      const [uids, options] = args
      assertArray(uids)
      return synchronizeSeedStats(socket, uids, options)
    }
    case 'managedseeds': {
      const [uids] = args
      assertArray(uids)
      return synchronizeManagedSeeds(socket, uids)
    }
    case 'managedseed-shoots': {
      const [uids] = args
      assertArray(uids)
      return synchronizeManagedSeedShoots(socket, uids)
    }
    default:
      throw new TypeError(`Invalid synchronization type - ${key}`)
  }
}

function assertArray (value) {
  if (!Array.isArray(value)) {
    throw new TypeError('Expected an array')
  }
}

export default {
  subscribe,
  unsubscribe,
  synchronize,
}
