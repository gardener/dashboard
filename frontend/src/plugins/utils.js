//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

function renderComponent (name, props) {
  return new Vue({
    render (h) {
      return h(name, { props })
    }
  }).$mount().$el
}

const VueUtils = {
  install (Vue) {
    Object.defineProperty(Vue.prototype, '$renderComponent', { value: renderComponent })
  }
}

Vue.use(VueUtils)
