//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createPinia } from 'pinia'

export { useAppStore } from './app'
export { useAuthnStore } from './authn'
export { useAuthzStore } from './authz'
export { useCloudProfileStore } from './cloudProfile'
export { useConfigStore } from './config'
export { useGardenerExtensionStore } from './gardenerExtension'
export { useKubeconfigStore } from './kubeconfig'
export { useLoginStore } from './login'
export { useMemberStore } from './member'
export { useProjectStore } from './project'
export { useQuotaStore } from './quota'
export { useSecretStore } from './secret'
export { useSeedStore } from './seed'
export { useShootStore } from './shoot'
export { useShootStagingStore } from './shootStaging'
export { useSocketStore } from './socket'
export { useTerminalStore } from './terminal'
export { useTicketStore } from './ticket'

export default createPinia()
