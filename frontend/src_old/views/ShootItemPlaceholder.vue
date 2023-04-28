<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <component :is="component" v-bind="componentProperties"></component>
</template>

<script>
import get from 'lodash/get'
import includes from 'lodash/includes'
import { mapState, mapGetters, mapActions } from 'vuex'
import ShootItemLoading from '@/views/ShootItemLoading.vue'
import ShootItemError from '@/views/ShootItemError.vue'

export default {
  components: {
    ShootItemLoading,
    ShootItemError
  },
  data () {
    return {
      loading: false,
      component: undefined,
      error: undefined,
      unsubscribe: () => {}
    }
  },
  computed: {
    ...mapState('shoots', [
      'subscriptionState',
      'subscriptionError'
    ]),
    ...mapGetters([
      'canGetSecrets',
      'canUseProjectTerminalShortcuts'
    ]),
    componentProperties () {
      switch (this.component) {
        case 'shoot-item-error': {
          const {
            code = 500,
            reason = 'Oops, something went wrong',
            message = 'An unexpected error occurred. Please try again later'
          } = this.error
          return { code, text: reason, message }
        }
        default: {
          return {}
        }
      }
    }
  },
  methods: {
    ...mapActions([
      'fetchcloudProviderSecrets',
      'ensureProjectTerminalShortcutsLoaded'
    ]),
    ...mapActions('shoots', {
      subscribeShoot: 'subscribe',
      unsubscribeShoot: 'unsubscribe'
    }),
    handleShootEvent ({ type, object }) {
      const metadata = object.metadata
      const { namespace, name } = get(this.$route, 'params', {})
      if (metadata.namespace !== namespace || metadata.name !== name) {
        return
      }
      if (type === 'DELETED') {
        this.error = Object.assign(new Error('The cluster you are looking for is no longer available'), {
          code: 410,
          reason: 'Cluster is gone'
        })
        this.component = 'shoot-item-error'
      } else if (type === 'ADDED' && includes([404, 410], get(this.error, 'code'))) {
        this.error = undefined
        this.component = 'router-view'
      }
    },
    async load ({ name, params }) {
      this.error = undefined
      this.component = 'shoot-item-loading'
      try {
        const promises = [
          this.subscribeShoot(params)
        ]
        if (includes(['ShootItem', 'ShootItemHibernationSettings'], name) && this.canGetSecrets) {
          promises.push(this.fetchcloudProviderSecrets()) // Required for purpose configuration
        }
        if (includes(['ShootItem', 'ShootItemHibernationSettings', 'ShootItemTerminal'], name) && this.canUseProjectTerminalShortcuts) {
          promises.push(this.ensureProjectTerminalShortcutsLoaded())
        }
        await Promise.all(promises)
        this.component = 'router-view'
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
        this.error = Object.assign(new Error(message), { code, reason })
        this.component = 'shoot-item-error'
      }
    }
  },
  async beforeRouteLeave (to, from, next) {
    try {
      this.component = 'div'
      await this.unsubscribeShoot()
    } finally {
      next()
    }
  },
  watch: {
    '$route' (value) {
      this.load(value)
    }
  },
  mounted () {
    this.unsubscribe = this.$store.subscribe(({ type, payload }) => {
      if (type === 'shoots/HANDLE_EVENT') {
        this.handleShootEvent(payload.event)
      }
    })
    this.load(this.$route)
  },
  beforeUnmount () {
    this.unsubscribe()
  }
}
</script>
