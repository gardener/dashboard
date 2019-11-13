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

// 'use strict'

const { isIP } = require('net')
const ApiGroup = require('./ApiGroup')
const Endpoint = require('./Endpoint')

class Api extends Map {
  constructor (options = {}) {
    super()
    this.create = key => {
      const apiGroup = ApiGroup.create(key, options)
      if (apiGroup) {
        return apiGroup
      }
      const endpoint = Endpoint.create(key, options)
      if (endpoint) {
        return endpoint
      }
      throw new TypeError(`Api ${key} not supported`)
    }
  }

  extend (Ctor) {
    Object.assign(this, Ctor.prototype)
  }

  get (key) {
    if (!this.has(key)) {
      this.set(key, this.create(key))
    }
    return super.get(key)
  }

  static create (options = {}) {
    const { hostname } = new URL(options.url)
    const defaultOptions = {
      servername: isIP(hostname) !== 0 ? '' : hostname,
      throwHttpErrors: true,
      resolveBodyOnly: true,
      timeout: 30 * 1000
    }
    return new Proxy(new Api({ ...defaultOptions, ...options }), {
      get (api, key) {
        if (typeof api[key] === 'function') {
          return api[key]
        }
        return api.get(key)
      }
    })
  }
}

module.exports = Api
