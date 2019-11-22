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

const Resource = require('../../Resource')
const { http, ws } = require('../../symbols')
const { createErrorEvent } = require('../../../util')

const pEvent = require('p-event')

class Shoot extends Resource {
  get (options = {}) {
    return this[http.get](options)
  }

  watch (options = {}) {
    return this[ws.watch](options)
  }

  async * eventIterator (options = {}) {
    const socket = this[ws.create](options)
    try {
      await pEvent(socket, 'open', { timeout: 3000 })
      const asyncIterator = pEvent.iterator(socket, 'message', { resolutionEvents: ['close'] })
      for await (let message of asyncIterator) {
        try {
          yield JSON.parse(message)
        } catch (error) {
          yield createErrorEvent({ error, message })
        }
      }
    } finally {
      socket.terminate()
    }
  }

  create (options = {}) {
    return this[http.post](options)
  }

  update (options = {}) {
    return this[http.put](options)
  }

  patch (options = {}) {
    return this[http.patch](options)
  }

  delete (options = {}) {
    return this[http.delete](options)
  }
}

Object.assign(Shoot, {
  group: 'core.gardener.cloud',
  version: 'v1alpha1',
  scope: 'Namespaced',
  names: {
    plural: 'shoots',
    singular: 'shoot',
    kind: 'Shoot'
  }
})

module.exports = Shoot
