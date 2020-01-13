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
const { patchHttpErrorMessage } = require('./util')

class HttpClient {
  constructor ({ url, ...options } = {}) {
    const prefixUrl = this[http.prefixUrl](url)
    this[http.client] = got.extend({ prefixUrl, ...options })
  }

  [http.prefixUrl] (url) {
    return url
  }

  async [http.request] (url, { searchParams, ...options } = {}) {
    if (searchParams && searchParams.toString()) {
      options.searchParams = searchParams
    }
    try {
      return await this[http.client](url, options)
    } catch (err) {
      throw patchHttpErrorMessage(err)
    }
  }
}

module.exports = HttpClient
