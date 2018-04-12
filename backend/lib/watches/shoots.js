//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const garden = require('../kubernetes').garden()
const { registerHandler } = require('./common')
const { shootHasIssue } = require('../utils')
const _ = require('lodash')

const shootsWithIssues = []

module.exports = io => {
  const emitter = garden.shoots.watch()
  registerHandler(emitter, event => {
    const namespace = event.object.metadata.namespace
    io.of('/shoots').to(namespace).emit('event', event)

    const shootIdentifier = `${namespace}_${event.object.metadata.name}`
    const idx = _.indexOf(shootsWithIssues, shootIdentifier)

    if (shootHasIssue(event.object)) {
      io.of('/shoots').to(`${namespace}_issues`).emit('event', event)
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
        io.of('/shoots').to(`${namespace}_issues`).emit('event', event)
      }
    }
  })
}
