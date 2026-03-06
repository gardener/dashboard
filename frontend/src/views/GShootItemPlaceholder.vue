<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <component
    :is="component"
    v-bind="componentProperties"
  />
</template>

<script>
import {
  ref,
  computed,
  provide,
  toRef,
} from 'vue'
import { useRoute } from 'vue-router'

import { useAuthzStore } from '@/store/authz'
import { useAuthnStore } from '@/store/authn'
import { useConfigStore } from '@/store/config'
import { useCredentialStore } from '@/store/credential'
import { useShootStore } from '@/store/shoot'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useProjectStore } from '@/store/project'
import { useSeedStore } from '@/store/seed'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useTerminalStore } from '@/store/terminal'

import GShootItemLoading from '@/views/GShootItemLoading.vue'
import GShootItemError from '@/views/GShootItemError.vue'

import { useProvideSeedItem } from '@/composables/useSeedItem/index'
import { useProvideProjectItem } from '@/composables/useProjectItem'
import { useProvideShootItem } from '@/composables/useShootItem'
import { useProvideShootHelper } from '@/composables/useShootHelper'
import {
  isLoadRequired,
  useItemPlaceholder,
} from '@/composables/useItemPlaceholder'

export default {
  components: {
    GShootItemLoading,
    GShootItemError,
  },
  beforeRouteEnter (to, from, next) {
    next(async vm => {
      if (isLoadRequired(vm.$route, to)) {
        await vm.load(to)
      }
    })
  },
  setup () {
    const route = useRoute()
    const authnStore = useAuthnStore()
    const authzStore = useAuthzStore()
    const configStore = useConfigStore()
    const shootStore = useShootStore()
    const credentialStore = useCredentialStore()
    const terminalStore = useTerminalStore()
    const cloudProfileStore = useCloudProfileStore()
    const projectStore = useProjectStore()
    const seedStore = useSeedStore()
    const gardenerExtensionStore = useGardenerExtensionStore()

    const activePopoverKey = ref('')

    const shootItem = computed(() => shootStore.shootByNamespaceAndName(route.params))

    async function load (to, { setError }) {
      const routeName = to.name
      const routeParams = to.params
      try {
        const promises = [
          shootStore.subscribe(routeParams),
        ]
        if (['ShootItem', 'ShootItemHibernationSettings'].includes(routeName) && authzStore.canGetCloudProviderCredentials) {
          promises.push(credentialStore.fetchCredentials()) // Required for purpose configuration
        }
        if (['ShootItem', 'ShootItemHibernationSettings', 'ShootItemTerminal'].includes(routeName) && authzStore.canUseProjectTerminalShortcuts) {
          promises.push(terminalStore.ensureProjectTerminalShortcutsLoaded())
        }
        await Promise.all(promises)

        if (routeName === 'ShootItemTerminal' && !authnStore.isAdmin & hasShootWorkerGroups.value) {
          setError(Object.assign(Error('Shoot has no workers to schedule a terminal pod'), {
            code: 404,
            reason: 'Terminal not available',
          }))
        }
      } catch (err) {
        let {
          statusCode,
          code = statusCode,
          reason,
          message,
        } = err
        if (code === 404) {
          reason = 'Cluster not found'
          message = 'The cluster you are looking for doesn\'t exist'
        } else if (code === 403) {
          reason = 'Access to cluster denied'
        } else if (code >= 500) {
          reason = 'Oops, something went wrong'
          message = 'An unexpected error occurred. Please try again later'
        }
        setError(Object.assign(new Error(message), {
          code,
          reason,
        }))
      }
    }

    provide('activePopoverKey', activePopoverKey)

    const projectItem = toRef(projectStore, 'project')

    useProvideProjectItem(projectItem)
    const {
      hasShootWorkerGroups,
      shootSeedName,
    } = useProvideShootItem(shootItem, {
      cloudProfileStore,
      projectStore,
    })

    useProvideShootHelper(shootItem, {
      cloudProfileStore,
      configStore,
      gardenerExtensionStore,
      credentialStore,
      seedStore,
    })

    const seedItem = computed(() => seedStore.seedByName(shootSeedName.value))
    useProvideSeedItem(seedItem)

    const {
      component,
      componentProperties,
      load: loadRoute,
    } = useItemPlaceholder({
      route,
      item: shootItem,
      load,
      errorComponent: 'g-shoot-item-error',
      loadingComponent: 'g-shoot-item-loading',
      getRouterViewProps: () => ({
        key: route.name === 'ShootItemTerminal'
          ? route.path
          : undefined,
      }),
      getGoneError: () => Object.assign(new Error('The cluster you are looking for is no longer available'), {
        code: 410,
        reason: 'Cluster is gone',
      }),
    })

    return {
      component,
      componentProperties,
      load: loadRoute,
    }
  },
}
</script>
