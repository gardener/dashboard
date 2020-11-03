<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <component :is="component" v-bind="componentProperties"></component>
</template>

<script>
import get from 'lodash/get'
import includes from 'lodash/includes'
import findLast from 'lodash/findLast'
import { mapGetters, mapActions } from 'vuex'
import ShootItemLoading from '@/views/ShootItemLoading'
import ShootItemError from '@/views/ShootItemError'

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
      'subscribeShoot',
      'subscribeComments',
      'unsubscribeComments',
      'fetchInfrastructureSecrets',
      'ensureProjectTerminalShortcutsLoaded'
    ]),
    handleShootEvents (events) {
      const { namespace, name } = get(this.$route, 'params', {})
      const event = findLast(events, { object: { metadata: { namespace, name } } })
      if (!event) {
        return
      }
      if (event.type === 'DELETED') {
        this.error = Object.assign(new Error('The cluster you are looking for is no longer available'), {
          code: 410,
          reason: 'Cluster is gone'
        })
        this.component = 'shoot-item-error'
      } else if (event.type === 'ADDED' && includes([404, 410], get(this.error, 'code'))) {
        this.error = undefined
        this.component = 'router-view'
      }
    },
    async load ({ name, params }) {
      this.error = undefined
      this.component = 'shoot-item-loading'
      try {
        const promises = [
          this.subscribeShoot(params),
          this.subscribeComments(params)
        ]
        if (includes(['ShootItem', 'ShootItemHibernationSettings'], name) && this.canGetSecrets) {
          promises.push(this.fetchInfrastructureSecrets()) // Required for purpose configuration
        }
        if (includes(['ShootItem', 'ShootItemHibernationSettings', 'ShootItemTerminal'], name) && this.canUseProjectTerminalShortcuts) {
          promises.push(this.ensureProjectTerminalShortcutsLoaded())
        }
        await Promise.all(promises)
        this.component = 'router-view'
      } catch (err) {
        this.error = err
        this.component = 'shoot-item-error'
      }
    }
  },
  async beforeRouteLeave (to, from, next) {
    try {
      await this.unsubscribeComments()
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
      if (type === 'shoots/HANDLE_EVENTS') {
        this.handleShootEvents(payload.events)
      }
    })
    this.load(this.$route)
  },
  beforeDestroy () {
    this.unsubscribe()
  }
}
</script>
