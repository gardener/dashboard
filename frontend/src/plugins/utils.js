//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createApp } from 'vue'

function renderComponent (name, props) {
  return createApp({
    render (h) {
      return h(name, { props })
    },
  }).mount().$el
}

export default {
  install (app) {
    app.config.globalProperties.$renderComponent = renderComponent
    app.provide('renderComponent', renderComponent)
  },
}
