//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

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
