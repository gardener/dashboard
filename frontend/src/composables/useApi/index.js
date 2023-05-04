//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { markRaw } from 'vue'

import api from './api'
import { registry } from './fetch'

export const useApi = () => {
  return markRaw(api)
}

export const useInterceptors = () => {
  return markRaw(registry)
}
