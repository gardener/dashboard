//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { get } = require('lodash')

const ioHelper = require('../io/helper')
const { isMemberOf } = require('../utils')

module.exports = (io, informer, options) => {
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
      const event = { uid }
      const canListProjects = get(user, ['profiles', 'canListProjects'], false)
      if (canListProjects) {
        event.type = type
      } else {
        const isMember = isMemberOf(newObject, user)
        const hasBeenMember = oldObject
          ? isMemberOf(oldObject, user)
          : false
        if (hasBeenMember && isMember) {
          event.type = 'MODIFIED'
        } else if (!hasBeenMember && isMember) {
          event.type = 'ADDED'
        } else if (hasBeenMember && !isMember) {
          event.type = 'DELETED'
        }
      }
      if (event.type) {
        const room = ioHelper.sha256(user.id)
        nsp.to(room).emit('projects', event)
      }
    }
  }

  informer.on('add', object => handleEvent('ADDED', object))
  informer.on('update', (object, oldObject) => handleEvent('MODIFIED', object, oldObject))
  informer.on('delete', object => handleEvent('DELETED', object))
}
