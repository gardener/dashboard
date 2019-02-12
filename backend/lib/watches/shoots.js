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
const garden = require('../kubernetes').garden()
const { registerHandler } = require('./common')
const { shootHasIssue } = require('../utils')
const { journals } = require('../services')
const _ = require('lodash')

const shootsWithIssues = []

module.exports = io => {
  const emitter = garden.shoots.watch()
  registerHandler(emitter, async function (event) {
    if (event.type === 'ERROR') {
      logger.error('shoots event error', event.object)
    } else {
      event.objectKey = _.get(event.object, 'metadata.uid') // objectKey used for throttling events on frontend (discard previous events for one batch for same objectKey)

      const name = event.object.metadata.name
      const namespace = event.object.metadata.namespace
      const namespacedEvents = { kind: 'shoots', namespaces: {} }
      namespacedEvents.namespaces[namespace] = [event]
      io.of('/shoots').to(`shoots_${namespace}`).emit('namespacedEvents', namespacedEvents)
      io.of('/shoots').to(`shoot_${namespace}_${name}`).emit('namespacedEvents', namespacedEvents)

      const shootIdentifier = `${namespace}_${name}`
      const idx = _.indexOf(shootsWithIssues, shootIdentifier)

      if (event.type === 'DELETED') {
        try {
          await journals.deleteJournals({ namespace, name })
        } catch (error) {
          logger.error('failed to delete journals for %s/%s: %s', namespace, name, error)
        }
      }

      if (shootHasIssue(event.object)) {
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
    }
  })
}
