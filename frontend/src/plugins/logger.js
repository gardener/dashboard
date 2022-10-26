//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

import createLogger from '@/utils/logger'

const VueStorage = {
  install (Vue) {
    const storage = Vue.localStorage
    const logger = createLogger(storage)
    Object.defineProperty(Vue, 'logger', { value: logger })
    Object.defineProperty(Vue.prototype, '$logger', { value: logger })
  }
}

Vue.use(VueStorage)
