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
  mapState,
  mapActions,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useSecretStore } from '@/store/secret'
import { useShootStore } from '@/store/shoot'
import { useTerminalStore } from '@/store/terminal'

import GShootItemLoading from '@/views/GShootItemLoading.vue'
import GShootItemError from '@/views/GShootItemError.vue'

import { isEqual } from '@/lodash'

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
  async beforeRouteUpdate (to, from) {
    if (isLoadRequired(this.$route, to)) {
      await this.load(to)
    }
  },
  beforeRouteLeave (to, from) {
    this.unsubscribe()
  },
  data () {
    return {
      error: null,
      readyState: 'initial',
      unsubscribeShootStore: () => {},
    }
  },
  computed: {
    ...mapState(useShootStore, [
      'subscriptionState',
      'subscriptionError',
    ]),
    ...mapState(useAuthzStore, [
      'canGetSecrets',
      'canUseProjectTerminalShortcuts',
    ]),
    component () {
      if (this.error) {
        return 'g-shoot-item-error'
      } else if (this.readyState === 'loading') {
        return 'g-shoot-item-loading'
      } else if (this.readyState === 'loaded') {
        return 'router-view'
      }
      return 'div'
    },
    componentProperties () {
      switch (this.component) {
        case 'g-shoot-item-error': {
          const {
            code = 500,
            reason = 'Oops, something went wrong',
            message = 'An unexpected error occurred. Please try again later',
          } = this.error
          return {
            code,
            text: reason,
            message,
          }
        }
        case 'router-view': {
          const { name, path } = this.$route
          return {
            key: name === 'ShootItemTerminal'
              ? path
              : undefined,
          }
        }
        default: {
          return {}
        }
      }
    },
  },
  watch: {
    '$route' () {
      this.readyState = 'loaded'
    },
  },
  beforeMount () {
    this.readyState = 'initial'
  },
  async mounted () {
    const shootStore = useShootStore()
    this.unsubscribeShootStore = shootStore.$onAction(({
      name,
      args,
      after,
    }) => {
      switch (name) {
        case 'handleEvent': {
          after(() => this.handleShootEvent(...args))
          break
        }
      }
    })
    await this.load(this.$route)
    this.readyState = 'loaded'
  },
  beforeUnmount () {
    this.readyState = 'initial'
    this.unsubscribeShootStore()
  },
  methods: {
    ...mapActions(useShootStore, [
      'subscribe',
      'unsubscribe',
    ]),
    ...mapActions(useSecretStore, [
      'fetchSecrets',
    ]),
    ...mapActions(useTerminalStore, [
      'ensureProjectTerminalShortcutsLoaded',
    ]),
    handleShootEvent ({ type, object }) {
      const metadata = object.metadata
      const routeParams = this.$route.params ?? {}
      if (metadata.namespace !== routeParams.namespace || metadata.name !== routeParams.name) {
        return
      }
      if (type === 'DELETED') {
        this.error = Object.assign(new Error('The cluster you are looking for is no longer available'), {
          code: 410,
          reason: 'Cluster is gone',
        })
      } else if (type === 'ADDED' && [404, 410].includes(this.error?.code)) {
        this.error = null
      }
    },
    async load (route) {
      this.error = null
      this.readyState = 'loading'
      const routeName = route.name
      const routeParams = route.params
      try {
        const promises = [
          this.subscribe(routeParams),
        ]
        if (['ShootItem', 'ShootItemHibernationSettings'].includes(routeName) && this.canGetSecrets) {
          promises.push(this.fetchSecrets()) // Required for purpose configuration
        }
        if (['ShootItem', 'ShootItemHibernationSettings', 'ShootItemTerminal'].includes(routeName) && this.canUseProjectTerminalShortcuts) {
          promises.push(this.ensureProjectTerminalShortcutsLoaded())
        }
        await Promise.all(promises)
      } catch (err) {
        let { statusCode, code = statusCode, reason, message } = err
        if (code === 404) {
          reason = 'Cluster not found'
          message = 'The cluster you are looking for doesn\'t exist'
        } else if (code === 403) {
          reason = 'Access to cluster denied'
        } else if (code >= 500) {
          reason = 'Oops, something went wrong'
          message = 'An unexpected error occurred. Please try again later'
        }
        this.error = Object.assign(new Error(message), {
          code,
          reason,
        })
      }
    },
  },
}
</script>
