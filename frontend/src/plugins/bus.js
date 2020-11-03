//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

const VueBus = {
  install (Vue) {
    const bus = new Vue({})
    Object.defineProperty(Vue.prototype, '$bus', { value: bus })
  }
}

Vue.use(VueBus)
