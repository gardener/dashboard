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
    const eventName = 'shoots'
    const { namespace, name, uid } = event.object.metadata

    const matchesMetadata = metadata => {
      if (metadata.allNamespaces) {
        return true
      }
      if (Array.isArray(metadata.namespaces)) {
        return metadata.namespaces.includes(namespace)
      }
      if (metadata.name) {
        return metadata.namespace === namespace && metadata.name === name
      }
      return metadata.namespace === namespace
    }
    const shootBroadcast = ({ type, object }) => {
      channels.shoots.broadcast({ type, object }, eventName, {
        filter (session) {
          const { events, metadata } = session.state
          return events.includes(eventName) && matchesMetadata(metadata)
        }
      })
    }
    shootBroadcast(event)

    const unhealthyShootsBroadcast = ({ type, object }) => {
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
      channels.unhealthyShoots.broadcast({ type, object }, eventName, {
        filter (session) {
          const { events, metadata } = session.state
          return events.includes(eventName) && matchesMetadata(metadata)
        }
      })
    }
    unhealthyShootsBroadcast(event)

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
