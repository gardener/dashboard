//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

import { UserManager } from '@/utils/auth'

const VueAuth = {
  install (Vue) {
    const auth = new UserManager()
    Object.defineProperty(Vue, 'auth', { value: auth })
    Object.defineProperty(Vue.prototype, '$auth', { value: auth })
  }
}

Vue.use(VueAuth)
