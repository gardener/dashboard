//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import shoots from './shoots.js'
import projects from './projects.js'

async function subscribe (socket, key, options = {}) {
  switch (key) {
    case 'shoots':
      await shoots.unsubscribe(socket)
      return shoots.subscribe(socket, options)
    default:
      throw new TypeError(`Invalid subscription type - ${key}`)
  }
}

async function unsubscribe (socket, key) {
  switch (key) {
    case 'shoots':
      return shoots.unsubscribe(socket)
    default:
      throw new TypeError(`Invalid subscription type - ${key}`)
  }
}

function synchronize (socket, key, ...args) {
  switch (key) {
    case 'shoots': {
      const [uids] = args
      assertArray(uids)
      return shoots.synchronize(socket, uids)
    }
    case 'projects': {
      const [uids] = args
      assertArray(uids)
      return projects.synchronize(socket, uids)
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
