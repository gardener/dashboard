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
import { useAuthnStore } from '@/store/authn'

import GShootItemLoading from '@/views/GShootItemLoading.vue'
import GShootItemError from '@/views/GShootItemError.vue'

export default {
  components: {
    GShootItemLoading,
    GShootItemError,
  },
  beforeRouteEnter (to, from, next) {
    next(async vm => {
      await vm.load(to)
    })
  },
  async beforeRouteUpdate (to, from) {
    await this.load(to)
  },
  beforeRouteLeave (to, from) {
    this.leaving = true
    this.unsubscribe()
  },
  data () {
    return {
      leaving: false,
      loading: false,
      error: null,
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
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    component () {
      if (this.error) {
        return 'g-shoot-item-error'
      }
      if (this.loading) {
        return 'g-shoot-item-loading'
      }
      if (this.leaving) {
        return 'div'
      }
      return 'router-view'
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
        default: {
          return {}
        }
      }
    },
    shootItem () {
      return this.shootByNamespaceAndName(this.$route.params)
    },
    hasShootWorkerGroups () {
      return !!this.shootItem?.spec?.provider?.workers?.length
    },
  },
  mounted () {
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
  },
  beforeUnmount () {
    this.unsubscribeShootStore()
  },
  methods: {
    ...mapActions(useShootStore, [
      'subscribe',
      'unsubscribe',
      'shootByNamespaceAndName',
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
      const routeName = route.name
      const routeParams = route.params
      this.error = null
      this.leaving = false
      this.loading = true
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

        if (routeName === 'ShootItemTerminal' && !this.isAdmin && !this.hasShootWorkerGroups) {
          this.error = Object.assign(Error('Shoot has no workers to schedule a terminal pod'), {
            code: 404,
            reason: 'Terminal not available',
          })
        }
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
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
