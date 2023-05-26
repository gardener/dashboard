//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createRouter } from '@/router'

export default {
  install (app) {
    app.use(createRouter())
    app.provide('$router', app.config.globalProperties.$router)
    app.provide('$route', app.config.globalProperties.$route)
  },
}
