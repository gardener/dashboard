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
const _ = require('lodash')
const {
  dashboardClient // privileged client for the garden cluster
} = require('../kubernetes-client')
const { bootstrapper } = require('../services/terminals')

const shootsWithIssues = []

module.exports = io => {
  const emitter = dashboardClient['core.gardener.cloud'].shoots.watchListAllNamespaces()
  registerHandler(emitter, async function (event) {
    const shoot = event.object
    if (event.type === 'ERROR') {
      logger.error('shoots event error', shoot)
      return
    }
    event.objectKey = _.get(shoot, 'metadata.uid') // objectKey used for throttling events on frontend (discard previous events for one batch for same objectKey)

    const name = shoot.metadata.name
    const namespace = shoot.metadata.namespace
    const namespacedEvents = { kind: 'shoots', namespaces: {} }
    namespacedEvents.namespaces[namespace] = [event]
    io.of('/shoots').to(`shoots_${namespace}`).emit('namespacedEvents', namespacedEvents)
    io.of('/shoots').to(`shoot_${namespace}_${name}`).emit('namespacedEvents', namespacedEvents)

    const shootIdentifier = `${namespace}_${name}`
    const idx = _.indexOf(shootsWithIssues, shootIdentifier)

    switch (event.type) {
      case 'ADDED':
        bootstrapper.bootstrapResource(shoot)
        break
      case 'MODIFIED':
        if (bootstrapper.isResourcePending(shoot)) {
          bootstrapper.bootstrapResource(shoot)
        }
        break
      case 'DELETED':
        if (bootstrapper.isResourcePending(shoot)) {
          bootstrapper.removePendingResource(shoot)
        }
        try {
          await journals.deleteJournals({ namespace, name })
        } catch (error) {
          logger.error('failed to delete journals for %s/%s: %s', namespace, name, error)
        }
        break
    }

    if (shootHasIssue(shoot)) {
      io.of('/shoots').to(`shoots_${namespace}_issues`).emit('namespacedEvents', namespacedEvents)
      if (idx === -1) {
        shootsWithIssues.push(shootIdentifier)
      } else {
        if (event.type === 'DELETED') {
          _.pullAt(shootsWithIssues, idx)
        }
      }
    } else {
      if (idx !== -1) {
        _.pullAt(shootsWithIssues, idx)
        event.type = 'DELETED'
        io.of('/shoots').to(`shoots_${namespace}_issues`).emit('namespacedEvents', namespacedEvents)
      }
    }
  })
}
