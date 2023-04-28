//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createPinia } from 'pinia'

export { useAppStore } from './app'
export { useConfigStore } from './config'
export { useProjectStore } from './project'
export { useAuthnzStore } from './authz'

export default createPinia()
