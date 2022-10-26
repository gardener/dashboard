//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

import createStorageWrapper from '@/utils/storage'

const VueStorage = {
  install (Vue) {
    const localStorage = createStorageWrapper(window.localStorage)
    Object.defineProperty(Vue, 'localStorage', { value: localStorage })
    Object.defineProperty(Vue.prototype, '$localStorage', { value: localStorage })
  }
}

Vue.use(VueStorage)
