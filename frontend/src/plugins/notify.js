//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import Notifications from '@kyvg/vue3-notification'

export default {
  install (app) {
    app.use(Notifications)
  },
}
