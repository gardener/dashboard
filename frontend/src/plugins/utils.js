//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createApp } from 'vue'
import { useApi } from '@/composables'

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
    app.config.globalProperties.$api = useApi()
    app.provide('api', app.config.globalProperties.$api)
  },
}
