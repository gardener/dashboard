//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { shootHasIssue } = require('../utils')

module.exports = (io, informer) => {
  const nsp = io.of('/')

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

  const publishUnhealthyShoots = (event) => {
    const { type, object, oldObject } = event
    const { namespace, uid } = object.metadata

    const hasIssue = shootHasIssue(object)
    const hadIssue = oldObject ? shootHasIssue(oldObject) : false

    let eventType
    if (type === 'DELETED') {
      if (!hasIssue) {
        return
      }
      eventType = 'DELETED'
    } else if (hasIssue && !hadIssue) {
      eventType = 'ADDED'
    } else if (hasIssue && hadIssue) {
      eventType = type
    } else if (!hasIssue && hadIssue) {
      eventType = 'DELETED'
    } else {
      return
    }

    const rooms = [
      'shoots:unhealthy:admin',
      `shoots:unhealthy;${namespace}`,
    ]
    nsp.to(rooms).emit('shoots', { type: eventType, uid })
  }

  const handleEvent = event => {
    publishShoots(event)
    publishUnhealthyShoots(event)
  }

  informer.on('add', object => handleEvent({ type: 'ADDED', object }))
  informer.on('update', (object, oldObject) => handleEvent({ type: 'MODIFIED', object, oldObject }))
  informer.on('delete', object => handleEvent({ type: 'DELETED', object }))
}
