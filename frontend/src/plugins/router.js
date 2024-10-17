//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createRouter,
  registerGlobalBeforeGuards,
  registerGlobalResolveGuards,
  registerGlobalAfterHooks,
} from '@/router'

export default {
  install (app) {
    const router = createRouter()
    app.use(router)
    app.provide('router', app.config.globalProperties.$router)
    app.provide('route', app.config.globalProperties.$route)
    // must be done after the router plugin has been installed
    // because some stores use the router or route
    registerGlobalBeforeGuards(router)
    registerGlobalResolveGuards(router)
    registerGlobalAfterHooks(router)
  },
}
