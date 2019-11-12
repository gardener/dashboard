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

class Pod extends Resource {
  get (options = {}) {
    return this[http.get](options)
  }

  watch (options = {}) {
    return this[ws.watch](options)
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

  log ({ name, query, ...options } = {}) {
    name = [name, 'log']
    const stream = query && query.follow
    return this[http.get]({ name, query, ...options, json: false, stream })
  }

  status ({ name, ...options } = {}) {
    name = [name, 'status']
    return this[http.get]({ name, ...options })
  }
}

Object.assign(Pod, {
  group: 'core',
  version: 'v1',
  scope: 'Namespaced',
  names: {
    plural: 'pods',
    singular: 'pod',
    kind: 'Pod'
  }
})

module.exports = Pod
