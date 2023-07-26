//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { messagesColor } from '@/directives'

// Styles
import '@/sass/main.scss'

import { loadFonts } from './webfontloader'
import store from './store'
import router from './router'
import vuetify from './vuetify'
import notify from './notify'
import yaml from './yaml'
import utils from './utils'
import components from './components'

export function registerPlugins (app) {
  loadFonts()
  app
    .use(store)
    .use(router)
    .use(vuetify)
    .use(notify)
    .use(yaml)
    .use(utils)
    .use(components)
    .directive('messagesColor', messagesColor)
}
