//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useLogger } from '@/composables'
import { useStores } from '@/store'

// Styles
import '@/sass/main.scss'

import { loadFonts } from './webfontloader'
import store from './store'
import router from './router'
import vuetify from './vuetify'
import notify from './notify'
import yaml from './yaml'
import utils from './utils'
import socket from './socket'

export function registerPlugins (app) {
  loadFonts()
  const logger = useLogger()
  app
    .use(store)
    .use(router, { logger, useStores })
    .use(vuetify)
    .use(notify)
    .use(yaml)
    .use(utils)
    .use(socket, { logger, useStores })
}
