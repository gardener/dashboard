//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

import pTimeout from 'p-timeout'

function setup (obj) {
  obj.vm = new Promise(resolve => {
    obj.resolve = resolve
  })
}

function logError (err) {
  // eslint-disable-next-line no-console
  console.error(err.message)
}

export function asyncRef (key) {
  const id = Symbol(key)
  const $key = '$' + key
  return {
    created () {
      setup(this[id] = {})
      this[$key] = {
        vm: ({ timeout = 3000 } = {}) => {
          return pTimeout(this[id].vm, timeout, `Promise $${key}.vm timed out`)
        },
        async dispatch (obj, ...args) {
          const { method, ...options } = typeof obj === 'string'
            ? { method: obj }
            : obj
          try {
            return (await this.vm(options))[method](...args)
          } catch (err) {
            logError(err)
          }
        },
        async get (name, options) {
          try {
            return (await this.vm(options))[name]
          } catch (err) {
            logError(err)
          }
        },
        hooks: {
          'hook:mounted': () => this[id].resolve(this.$refs[key]),
          'hook:beforeDestroy': () => setup(this[id])
        }
      }
    }
  }
}

export default asyncRef
