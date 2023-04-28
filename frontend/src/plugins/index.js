//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Styles
import '@/sass/main.scss'

import pinia from '@/store'
import { createRouter } from '@/router'

// Plugins
import notify from './notify'
import yaml from './yaml'
import utils from './utils'
import vuetify from './vuetify'
import { loadFonts } from './webfontloader'

export function registerPlugins (app) {
  loadFonts()
  app
    .use(pinia)
    .use(createRouter())
    .use(vuetify)
    .use(notify)
    .use(yaml)
    .use(utils)
}
