//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
const yaml = import(/* webpackPrefetch: true */ 'js-yaml')

const VueYaml = {
  install (Vue) {
    const value = {
      dump (obj) {
        return yaml.then(({ dump }) => dump(obj, {
          skipInvalid: true
        }))
      },
      load (data) {
        return yaml.then(({ load }) => load(data))
      }
    }
    Object.defineProperty(Vue, 'yaml', { value })
    Object.defineProperty(Vue.prototype, '$yaml', { value })
  }
}

Vue.use(VueYaml)
