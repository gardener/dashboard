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

const apiGroups = [
  'apiregistration.k8s.io',
  'authentication.k8s.io',
  'authorization.k8s.io',
  'core',
  'core.gardener.cloud',
  'dashboard.gardener.cloud',
  'extensions'
].reduce((apiGroups, key) => {
  apiGroups[key] = require(`./${key}`)
  return apiGroups
}, {})

class ApiGroup extends Map {
  constructor (apiGroup, options = {}) {
    super()
    this.create = key => {
      if (key in apiGroup) {
        return new apiGroup[key](options)
      } else {
        throw new TypeError(`Resource ${key} not supported`)
      }
    }
  }

  get (key) {
    if (!this.has(key)) {
      this.set(key, this.create(key))
    }
    return super.get(key)
  }

  static create (key, options) {
    if (key in apiGroups) {
      return new Proxy(new ApiGroup(apiGroups[key], options), {
        get (apiGroup, key) {
          return apiGroup.get(key)
        }
      })
    }
  }
}

module.exports = ApiGroup
