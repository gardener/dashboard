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

class Api {
  constructor (options = {}) {
    ApiGroup.assignAll(this, options)
    Endpoint.assignAll(this, options)
  }

  getResources () {
    return this.constructor.getResources()
  }

  static getResources () {
    return ApiGroup.getResources()
  }

  static create (options = {}) {
    const { hostname } = new URL(options.url)
    const defaultOptions = {
      servername: isIP(hostname) !== 0 ? '' : hostname,
      throwHttpErrors: true,
      resolveBodyOnly: true,
      timeout: 30 * 1000
    }
    return new Api({ ...defaultOptions, ...options })
  }
}

module.exports = Api
