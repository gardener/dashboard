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

const got = require('got')
const { http } = require('./symbols')

class BaseResource {
  constructor ({ url, ...options } = {}) {
    const prefixUrl = this[http.prefixUrl](url)
    this[http.client] = got.extend({ prefixUrl, ...options })
  }

  [http.prefixUrl] (url) {
    return url.replace(/\/$/, '')
  }

  [http.pathname] () {
    return this.constructor.name.toLocaleLowerCase()
  }

  [http.request] (options = {}) {
    return this[http.client](this[http.pathname](options), options)
  }

  [http.get] (options = {}) {
    return this[http.request]({ method: 'get', ...options })
  }

  [http.post] (options = {}) {
    return this[http.request]({ method: 'post', ...options })
  }

  [http.put] (options = {}) {
    return this[http.request]({ method: 'put', ...options })
  }

  [http.patch] (options = {}) {
    return this[http.request]({ method: 'patch', ...options })
  }

  [http.delete] (options = {}) {
    return this[http.request]({ method: 'delete', ...options })
  }
}

module.exports = BaseResource
