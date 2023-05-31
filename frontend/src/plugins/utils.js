//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createVNode, render } from 'vue'
import { useLogger, useApi } from '@/composables'

function renderComponent (name, props) {
  const vNode = createVNode(name, props)
  const element = document.createElement('div')
  render(vNode, element)
  return element
}

export default {
  install (app) {
    app.provide('renderComponent', app.config.globalProperties.$renderComponent = renderComponent)
    app.provide('api', app.config.globalProperties.$api = useApi())
    app.provide('logger', app.config.globalProperties.$logger = useLogger())
  },
}
