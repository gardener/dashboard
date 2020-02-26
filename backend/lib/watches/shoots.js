//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const logger = require('../logger')
const { registerHandler } = require('./common')
const { shootHasIssue } = require('../utils')
const { journals } = require('../services')
const {
  dashboardClient // privileged client for the garden cluster
} = require('../kubernetes-client')
const { bootstrapper } = require('../services/terminals')

async function deleteJournals ({ namespace, name }) {
  try {
    await journals.deleteJournals({ namespace, name })
  } catch (error) {
    logger.error('failed to delete journals for %s/%s: %s', namespace, name, error)
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

module.exports = (io, { shootsWithIssues = new Set() } = {}) => {
  const nsp = io.of('/shoots')
  const emitter = dashboardClient['core.gardener.cloud'].shoots.watchListAllNamespaces()
  registerHandler(emitter, async event => {
    const { type, object } = event
    const { namespace, name, uid } = object.metadata

    const namespacedEvents = toNamespacedEvents(event)
    nsp.to(`shoots_${namespace}`).emit('namespacedEvents', namespacedEvents)
    nsp.to(`shoot_${namespace}_${name}`).emit('namespacedEvents', namespacedEvents)

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

    switch (type) {
      case 'ADDED':
        bootstrapper.bootstrapResource(object)
        break
      case 'MODIFIED':
        if (bootstrapper.isResourcePending(object)) {
          bootstrapper.bootstrapResource(object)
        }
        break
      case 'DELETED':
        if (bootstrapper.isResourcePending(object)) {
          bootstrapper.removePendingResource(object)
        }
        deleteJournals(object.metadata)
        break
    }
  })
}
