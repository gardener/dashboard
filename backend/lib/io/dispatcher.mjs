//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { subscribe as shootsSubscribe, unsubscribe as shootsUnsubscribe, synchronize as shootsSynchronize } from './shoots.mjs'
import { synchronize as projectsSynchronize } from './projects.mjs'

async function subscribe (socket, key, options = {}) {
  switch (key) {
    case 'shoots':
      await shootsUnsubscribe(socket)
      return shootsSubscribe(socket, options)
    default:
      throw new TypeError(`Invalid subscription type - ${key}`)
  }
}

async function unsubscribe (socket, key) {
  switch (key) {
    case 'shoots':
      return shootsUnsubscribe(socket)
    default:
      throw new TypeError(`Invalid subscription type - ${key}`)
  }
}

function synchronize (socket, key, ...args) {
  switch (key) {
    case 'shoots': {
      const [uids] = args
      assertArray(uids)
      return shootsSynchronize(socket, uids)
    }
    case 'projects': {
      const [uids] = args
      assertArray(uids)
      return projectsSynchronize(socket, uids)
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
