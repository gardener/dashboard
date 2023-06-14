//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  useLogger,
  useApi,
  useSanitizeUrl,
  useRenderComponent,
} from '@/composables'

export default {
  install (app) {
    app.provide('logger', useLogger())
    app.provide('api', useApi())
    app.provide('sanitizeUrl', useSanitizeUrl())
    app.provide('renderComponent', useRenderComponent())
  },
}
