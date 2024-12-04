//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const shoots = require('./shoots')

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
      if (!Array.isArray(uids)) {
        throw new TypeError('Invalid parameters for synchronize shoots')
      }
      return shoots.synchronize(socket, uids)
    }
    default:
      throw new TypeError(`Invalid synchronization type - ${key}`)
  }
}

module.exports = {
  subscribe,
  unsubscribe,
  synchronize,
}
