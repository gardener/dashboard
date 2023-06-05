//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useLogger } from '@/composables'
import { useStores as useStoresDefault } from '@/store'
import { createRouter } from '@/router'

export default {
  install (app, options = {}) {
    const {
      logger = useLogger(),
      useStores = useStoresDefault,
    } = options

    app.use(createRouter({ logger, useStores }))
    app.provide('router', app.config.globalProperties.$router)
    app.provide('route', app.config.globalProperties.$route)
  },
}
