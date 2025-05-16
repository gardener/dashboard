//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { get } = require('lodash')

const ioHelper = require('../io/helper')

module.exports = (io, informer) => {
  const nsp = io.of('/')

  const handleEvent = async (type, newObject, oldObject) => {
    const path = ['metadata', 'uid']
    const uid = get(newObject, path, get(oldObject, path))
    const sockets = await io.fetchSockets()
    const users = new Map()
    for (const socket of sockets) {
      const user = ioHelper.getUserFromSocket(socket)
      if (user) {
        users.set(user.id, user)
      }
    }
    for (const user of users.values()) {
      const canListSeeds = get(user, ['profiles', 'canListSeeds'], false)
      if (!canListSeeds) {
        continue
      }
      const event = { uid, type }
      const room = ioHelper.sha256(user.id)
      nsp.to(room).emit('seeds', event)
    }
  }

  informer.on('add', object => handleEvent('ADDED', object))
  informer.on('update', (object, oldObject) => handleEvent('MODIFIED', object, oldObject))
  informer.on('delete', object => handleEvent('DELETED', object))
}
