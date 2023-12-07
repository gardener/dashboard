//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import componentsPlugin from '@/plugins/components'
import utilsPlugin from '@/plugins/utils'
import notifyPlugin from '@/plugins/notify'

import 'vuetify/styles'

export function createVuetifyPlugin () {
  return createVuetify({
    icons: {
      defaultSet: 'mdi',
    },
    components,
    directives,
  })
}

export function createPlugins () {
  return [
    createVuetifyPlugin(),
    componentsPlugin,
    utilsPlugin,
    notifyPlugin,
  ]
}
