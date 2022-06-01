//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import EventEmitter from 'events'

const VueBus = {
  install (Vue) {
    const bus = new EventEmitter()
    Object.defineProperty(Vue.prototype, '$bus', {
      value: bus
    })
  }
}

Vue.use(VueBus)
