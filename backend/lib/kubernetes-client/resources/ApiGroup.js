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
].reduce((accumulator, key) => {
  accumulator[key] = require(`./${key}`)
  return accumulator
}, {})

class ApiGroup {
  constructor (key, options = {}) {
    for (const [name, Ctor] of Object.entries(apiGroups[key])) {
      this[name] = new Ctor(options)
    }
  }

  static assignAll (client, options) {
    for (const key of Object.keys(apiGroups)) {
      client[key] = new ApiGroup(key, options)
    }
    return client
  }

  static getResources () {
    const resources = {}
    for (const apiGroup of Object.values(apiGroups)) {
      for (const { group, version, names: { plural, kind } = {} } of Object.values(apiGroup)) {
        if (group && version && kind && plural) {
          const name = plural
          const apiVersion = group === 'core' ? version : `${group}/${version}`
          resources[kind] = { name, kind, apiVersion }
        }
      }
    }
    return resources
  }
}

module.exports = ApiGroup
