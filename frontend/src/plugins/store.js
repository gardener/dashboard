//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import pinia from '@/store'

export default {
  install (app) {
    app.use(pinia)
  },
}
