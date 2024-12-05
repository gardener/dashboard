//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const ioHelper = require('../io/helper')
const { isMemberOf } = require('../utils')

module.exports = (io, informer, options) => {
  const nsp = io.of('/')

  const handleEvent = async (newObject, oldObject) => {
    const { uid } = newObject.metadata

    const sockets = await io.fetchSockets()
    const users = new Map()
    for (const socket of sockets) {
      const user = ioHelper.getUserFromSocket(socket)
      if (user) {
        users.set(user.id, user)
      }
    }
    for (const user of users.values()) {
      const isMember = isMemberOf(newObject, user)
      const hasBeenMember = oldObject
        ? isMemberOf(oldObject, user)
        : false
      let type
      if (hasBeenMember && isMember) {
        type = 'MODIFIED'
      } else if (!hasBeenMember && isMember) {
        type = 'ADDED'
      } else if (hasBeenMember && !isMember) {
        type = 'DELETED'
      }
      if (type) {
        const room = ioHelper.sha256(user.id)
        nsp.to(room).emit('projects', { type, uid })
      }
    }
  }

  informer.on('add', (...args) => handleEvent(...args))
  informer.on('update', (...args) => handleEvent(...args))
  informer.on('delete', (...args) => handleEvent(null, ...args))
}
