//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createPinia } from 'pinia'

export { useAppStore } from './app'
export { useConfigStore } from './config'
export { useAuthnStore } from './authn'
export { useAuthzStore } from './authz'
export { useProjectStore } from './project'
export { useMemberStore } from './member'
export { useShootStore } from './shoot'
export { useCloudprofileStore } from './cloudprofile'
export { useSeedStore } from './seed'
export { useGardenerExtensionStore } from './gardenerExtension'
export { useKubeconfigStore } from './kubeconfig'
export { useLoginStore } from './login'

export default createPinia()
