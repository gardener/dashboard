//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import pinia from '@/store'

export default {
  install (app) {
    app.use(pinia)
  },
}
