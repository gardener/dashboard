//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import pinia, {
  useAppStore,
  useAuthnStore,
  useAuthzStore,
  useCloudProfileStore,
  useConfigStore,
  useGardenerExtensionStore,
  useKubeconfigStore,
  useMemberStore,
  useProjectStore,
  useQuotaStore,
  useSecretStore,
  useSeedStore,
  useShootStagingStore,
  useShootStore,
  useSocketStore,
  useTerminalStore,
  useTicketStore,
} from '@/store'

export default {
  install (app) {
    app.use(pinia)
    app.provide('appStore', app.config.globalProperties.$appStore = useAppStore())
    app.provide('authnStore', app.config.globalProperties.$authnStore = useAuthnStore())
    app.provide('authzStore', app.config.globalProperties.$authzStore = useAuthzStore())
    app.provide('cloudProfileStore', app.config.globalProperties.$cloudProfileStore = useCloudProfileStore())
    app.provide('configStore', app.config.globalProperties.$configStore = useConfigStore())
    app.provide('gardenerExtensionStore', app.config.globalProperties.$configStore = useGardenerExtensionStore())
    app.provide('kubeconfigStore', app.config.globalProperties.$kubeconfigStore = useKubeconfigStore())
    app.provide('memberStore', app.config.globalProperties.$memberStore = useMemberStore())
    app.provide('projectStore', app.config.globalProperties.$projectStore = useProjectStore())
    app.provide('quotaStore', app.config.globalProperties.$quotaStore = useQuotaStore())
    app.provide('secretStore', app.config.globalProperties.$secretStore = useSecretStore())
    app.provide('seedStore', app.config.globalProperties.$seedStore = useSeedStore())
    app.provide('shootStore', app.config.globalProperties.$shootStore = useShootStore())
    app.provide('shootStagingStore', app.config.globalProperties.$shootStagingStore = useShootStagingStore())
    app.provide('socketStore', app.config.globalProperties.$socketStore = useSocketStore())
    app.provide('terminalStore', app.config.globalProperties.$terminalStore = useTerminalStore())
    app.provide('ticketStore', app.config.globalProperties.$ticketStore = useTicketStore())
  },
}
