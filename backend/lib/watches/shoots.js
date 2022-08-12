//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const logger = require('../logger')
const { shootHasIssue } = require('../utils')
const { tickets } = require('../services')
const { bootstrapper } = require('../services/terminals')
const cache = require('../cache')
const channels = require('../channels')

async function deleteTickets ({ namespace, name }) {
  try {
    const projectName = cache.findProjectByNamespace(namespace).metadata.name
    await tickets.deleteTickets({ projectName, name })
  } catch (error) {
    logger.error('failed to delete tickets for %s/%s: %s', namespace, name, error)
  }
}

module.exports = (informer, { shootsWithIssues = new Set() } = {}) => {
  const handleEvent = event => {
    channels.shoots.publish('shoots', event)

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
      channels.unhealthyShoots.publish('shoots', { type, object })
    }
    unhealthyShootsPublish(event)

    bootstrapper.handleResourceEvent(event)

    switch (event.type) {
      case 'DELETED':
        deleteTickets(event.object.metadata)
        break
    }
  }

  informer.on('add', object => handleEvent({ type: 'ADDED', object }))
  informer.on('update', object => handleEvent({ type: 'MODIFIED', object }))
  informer.on('delete', object => handleEvent({ type: 'DELETED', object }))
}
