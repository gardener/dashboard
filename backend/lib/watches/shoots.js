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

async function deleteTickets ({ namespace, name }) {
  try {
    const projectName = cache.findProjectByNamespace(namespace).metadata.name
    await tickets.deleteTickets({ projectName, name })
  } catch (error) {
    logger.error('failed to delete tickets for %s/%s: %s', namespace, name, error)
  }
}

function toNamespacedEvents ({ type, object }) {
  const { namespace, uid } = object.metadata
  return {
    kind: 'shoots',
    namespaces: {
      [namespace]: [{
        type,
        object,
        objectKey: uid // objectKey used for throttling events on frontend (discard previous events for one batch for same objectKey)
      }]
    }
  }
}

module.exports = (io, informer, { shootsWithIssues = new Set() } = {}) => {
  const nsp = io.of('/shoots')
  const handleEvent = event => {
    const { type, object } = event
    const { namespace, name, uid } = object.metadata

    const namespacedEvents = toNamespacedEvents(event)
    nsp.to(`shoots_${namespace}`).emit('namespacedEvents', namespacedEvents)
    nsp.to(`shoot_${namespace}_${name}`).emit('namespacedEvents', { ...namespacedEvents, kind: 'shoot' })

    if (shootHasIssue(object)) {
      nsp.to(`shoots_${namespace}_issues`).emit('namespacedEvents', namespacedEvents)
      if (!shootsWithIssues.has(uid)) {
        shootsWithIssues.add(uid)
      } else if (type === 'DELETED') {
        shootsWithIssues.delete(uid)
      }
    } else if (shootsWithIssues.has(uid)) {
      nsp.to(`shoots_${namespace}_issues`).emit('namespacedEvents', toNamespacedEvents({ type: 'DELETED', object }))
      shootsWithIssues.delete(uid)
    }

    bootstrapper.handleResourceEvent(event)

    switch (type) {
      case 'DELETED':
        deleteTickets(object.metadata)
        break
    }
  }

  informer.on('add', object => handleEvent({ type: 'ADDED', object }))
  informer.on('update', object => handleEvent({ type: 'MODIFIED', object }))
  informer.on('delete', object => handleEvent({ type: 'DELETED', object }))
}
