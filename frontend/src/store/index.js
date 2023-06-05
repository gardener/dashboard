//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createPinia, mapStores } from 'pinia'

import { useAppStore } from './app'
import { useAuthnStore } from './authn'
import { useAuthzStore } from './authz'
import { useCloudProfileStore } from './cloudProfile'
import { useConfigStore } from './config'
import { useGardenerExtensionStore } from './gardenerExtension'
import { useKubeconfigStore } from './kubeconfig'
import { useLoginStore } from './login'
import { useMemberStore } from './member'
import { useProjectStore } from './project'
import { useQuotaStore } from './quota'
import { useSecretStore } from './secret'
import { useSeedStore } from './seed'
import { useShootStore } from './shoot'
import { useShootStagingStore } from './shootStaging'
import { useSocketStore } from './socket'
import { useTerminalStore } from './terminal'
import { useTicketStore } from './ticket'

export {
  useAppStore,
  useAuthnStore,
  useAuthzStore,
  useCloudProfileStore,
  useConfigStore,
  useGardenerExtensionStore,
  useKubeconfigStore,
  useLoginStore,
  useMemberStore,
  useProjectStore,
  useQuotaStore,
  useSecretStore,
  useSeedStore,
  useShootStore,
  useShootStagingStore,
  useSocketStore,
  useTerminalStore,
  useTicketStore,
}

export const useStore = mapStores(...[
  useAppStore,
  useAuthnStore,
  useAuthzStore,
  useCloudProfileStore,
  useConfigStore,
  useGardenerExtensionStore,
  useKubeconfigStore,
  useLoginStore,
  useMemberStore,
  useProjectStore,
  useQuotaStore,
  useSecretStore,
  useSeedStore,
  useShootStore,
  useShootStagingStore,
  useSocketStore,
  useTerminalStore,
  useTicketStore,
])

export function useStores (...args) {
  const ids = args.flat(1)
  const iteratee = (stores, id) => {
    const key = `${id}Store`
    stores[key] = useStore[key]()
    return stores
  }
  return ids.reduce(iteratee, {})
}

export default createPinia()
