//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

const VueYaml = {
  install (Vue) {
    const yaml = {
      async safeDump (value) {
        const { default: yaml } = await import('js-yaml/dist/js-yaml.min.js')
        return yaml.safeDump(value, {
          skipInvalid: true
        })
      },
      async safeLoad (value) {
        const { default: yaml } = await import('js-yaml/dist/js-yaml.min.js')
        return yaml.safeLoad(value)
      }
    }
    Object.defineProperty(Vue, 'yaml', { value: yaml })
    Object.defineProperty(Vue.prototype, '$yaml', { value: yaml })
  }
}

Vue.use(VueYaml)
