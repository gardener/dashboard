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

async function subscribe (socket, key, options = {}) {
  switch (key) {
    case 'shoots':
      await unsubscribeShoots(socket)
      return subscribeShoots(socket, options)
    default:
      throw new TypeError(`Invalid subscription type - ${key}`)
  }
}

async function unsubscribe (socket, key) {
  switch (key) {
    case 'shoots':
      return unsubscribeShoots(socket)
    default:
      throw new TypeError(`Invalid subscription type - ${key}`)
  }
}

function synchronize (socket, workspace, key, ...args) {
  switch (key) {
    case 'shoots': {
      const [uids] = args
      assertArray(uids)
      return synchronizeShoots(socket, workspace, uids)
    }
    case 'projects': {
      const [uids] = args
      assertArray(uids)
      return synchronizeProjects(socket, workspace, uids)
    }
    case 'seeds': {
      const [uids] = args
      assertArray(uids)
      return synchronizeSeeds(socket, uids)
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
