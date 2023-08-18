//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { shootHasIssue } = require('../utils')

module.exports = (io, informer, { shootsWithIssues = new Set() } = {}) => {
  const nsp = io.of('/')

  const handleEvent = event => {
    const { namespace, name } = event.object.metadata
    const rooms = [
      'shoots:admin',
      `shoots;${namespace}`,
      `shoots;${namespace}/${name}`
    ]
    nsp.to(rooms).emit('shoots', event)

    const unhealthyShootsPublish = ({ type, object }) => {
      const { uid } = object.metadata
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
        `shoots:unhealthy;${namespace}`
      ]
      nsp.to(rooms).emit('shoots', { type, object })
    }
    unhealthyShootsPublish(event)
  }

  informer.on('add', object => handleEvent({ type: 'ADDED', object }))
  informer.on('update', object => handleEvent({ type: 'MODIFIED', object }))
  informer.on('delete', object => handleEvent({ type: 'DELETED', object }))
}
