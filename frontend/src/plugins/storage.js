//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

const VueStorage = {
  install (Vue) {
    const localStorage = {
      setItem (key, value) {
        window.localStorage.setItem(key, value)
      },
      getItem (key) {
        return window.localStorage.getItem(key)
      },
      removeItem (key) {
        window.localStorage.removeItem(key)
      },
      setObject (key, value) {
        this.setItem(key, JSON.stringify(value))
      },
      getObject (key) {
        const value = this.getItem(key)
        if (value) {
          try {
            return JSON.parse(value)
          } catch (err) { /* ignore error */ }
        }
      }
    }
    Object.defineProperty(Vue, 'localStorage', { value: localStorage })
    Object.defineProperty(Vue.prototype, '$localStorage', { value: localStorage })
  }
}

Vue.use(VueStorage)
