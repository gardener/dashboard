//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components' // eslint-disable-line import/no-unresolved
import * as directives from 'vuetify/directives' // eslint-disable-line import/no-unresolved

import 'vuetify/styles' // eslint-disable-line import/no-unresolved

export function createVuetifyPlugin () {
  return createVuetify({
    icons: {
      defaultSet: 'mdi',
    },
    components,
    directives,
  })
}
