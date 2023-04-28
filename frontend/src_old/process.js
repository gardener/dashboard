//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  title: 'browser',
  platform: 'browser',
  browser: true,
  version: '',
  versions: {},
  argv: [],
  env: new Proxy({}, {
    get (obj, prop) {
      if (Reflect.has(process.env, prop)) {
        return process.env[prop]
      }
      return obj[prop]
    },
    set (obj, prop, value) {
      if (Reflect.has(process.env, prop)) {
        return false
      }
      obj[prop] = value
      return true
    },
  }),
  nextTick (callback, ...args) {
    setImmediate(callback, ...args)
  },
}
