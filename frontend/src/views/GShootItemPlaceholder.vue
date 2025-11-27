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
  watch,
  onBeforeMount,
  onMounted,
  onBeforeUnmount,
  toRef,
} from 'vue'
import {
  useRoute,
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
} from 'vue-router'

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

import { useProvideSeedItem } from '@/composables/useSeedItem'
import { useProvideProjectItem } from '@/composables/useProjectItem'
import { useProvideShootItem } from '@/composables/useShootItem'
import { useProvideShootHelper } from '@/composables/useShootHelper'

import isEqual from 'lodash/isEqual'

function isLoadRequired (route, to) {
  return route.name !== to.name || !isEqual(route.params, to.params)
}

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
    const error = ref(null)
    const readyState = ref('initial')

    const shootItem = computed(() => shootStore.shootByNamespaceAndName(route.params))

    const component = computed(() => {
      if (error.value) {
        return 'g-shoot-item-error'
      } else if (readyState.value === 'loading') {
        return 'g-shoot-item-loading'
      } else if (readyState.value === 'loaded') {
        return 'router-view'
      }
      return 'div'
    })

    const componentProperties = computed(() => {
      switch (component.value) {
        case 'g-shoot-item-error': {
          const {
            code = 500,
            reason = 'Oops, something went wrong',
            message = 'An unexpected error occurred. Please try again later',
          } = error.value
          return {
            code,
            text: reason,
            message,
          }
        }
        case 'router-view': {
          return {
            key: route.name === 'ShootItemTerminal'
              ? route.path
              : undefined,
          }
        }
        default: {
          return {}
        }
      }
    })

    async function load (to) {
      error.value = null
      readyState.value = 'loading'
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
          error.value = Object.assign(Error('Shoot has no workers to schedule a terminal pod'), {
            code: 404,
            reason: 'Terminal not available',
          })
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
        error.value = Object.assign(new Error(message), {
          code,
          reason,
        })
      }
    }

    onBeforeMount(() => {
      readyState.value = 'initial'
    })

    onMounted(async () => {
      await load(route)
      readyState.value = 'loaded'
    })

    onBeforeUnmount(() => {
      readyState.value = 'initial'
    })

    onBeforeRouteUpdate(async to => {
      if (isLoadRequired(route, to)) {
        await load(to)
      }
    })

    onBeforeRouteLeave(() => {
      readyState.value = 'initial'
    })

    watch(() => route.path, value => {
      if (value) {
        readyState.value = 'loaded'
      }
    })

    watch(() => shootItem.value, value => {
      if (readyState.value === 'loaded') {
        if (!value) {
          error.value = Object.assign(new Error('The cluster you are looking for is no longer available'), {
            code: 410,
            reason: 'Cluster is gone',
          })
        } else if ([404, 410].includes(error.value?.code)) {
          error.value = null
        }
      }
    })

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

    return {
      component,
      componentProperties,
      load,
    }
  },
}
</script>
