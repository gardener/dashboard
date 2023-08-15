//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mergeProps } from 'vue'

import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'
import { useSanitizeUrl } from '@/composables/useSanitizeUrl'
import { useRenderComponent } from '@/composables/useRenderComponent'

export default {
  install (app) {
    app.provide('logger', useLogger())
    app.provide('api', useApi())
    app.provide('sanitizeUrl', useSanitizeUrl())
    app.provide('renderComponent', useRenderComponent())
    app.provide('mergeProps', mergeProps)
  },
}
