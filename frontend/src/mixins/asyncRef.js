//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
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
  const _key = '_' + key
  return {
    created () {
      setup(this[id] = {})
      this[_key] = {
        vm: ({ timeout = 3000 } = {}) => {
          return pTimeout(this[id].vm, { milliseconds: timeout }, `Promise $${key}.vm timed out`)
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
          'hook:beforeDestroy': () => setup(this[id]),
        },
      }
    },
  }
}

export default asyncRef
