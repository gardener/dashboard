//
// Copyright 2018 by The Gardener Authors.
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

const _ = require('lodash')
const { registerHandler } = require('./common')

const labelSelector = 'garden.sapcloud.io/role=project'
const qs = {labelSelector}

module.exports = (client, io) => {
  client
    .readNamespaces({qs})
    .then(({items}) => {
      initializeNamespaces(io, items)
    })
    .then(() => {
      const watch = client.watchNamespaces({qs})
      registerHandler(watch, event => {
        if (event.type === 'ADDED') {
          initializeNamespace(io, event.object.metadata.name)
        }
      })
    })
}

function initializeNamespaces (io, items) {
  _.forEach(items, item => {
    initializeNamespace(io, item.metadata.name)
  })
}

function initializeNamespace (io, namespace) {
  io.to(namespace).emit('ready')
}
