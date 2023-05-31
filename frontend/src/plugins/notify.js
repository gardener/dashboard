//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import notification from '@kyvg/vue3-notification'

export default {
  install (app) {
    app.use(notification)
    app.provide('notify', app.config.globalProperties.$notify)
  },
}
