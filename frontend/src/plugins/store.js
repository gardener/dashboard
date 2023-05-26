//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import pinia, {
  useAppStore,
  useAuthnStore,
  useAuthzStore,
  useProjectStore,
} from '@/store'

export default {
  install (app) {
    app.use(pinia)
    app.provide('$app', useAppStore())
    app.provide('$authn', useAuthnStore())
    app.provide('$authz', useAuthzStore())
    app.provide('$project', useProjectStore())
    app.provide('store', {
      $app: useAppStore(),
    })
  },
}
