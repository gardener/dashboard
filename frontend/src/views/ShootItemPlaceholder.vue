<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->
<template>
  <component :is="component" v-bind="componentProperties"></component>
</template>

<script>
import get from 'lodash/get'
import includes from 'lodash/includes'
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
      for (const { type, object: { metadata = {} } } of events) {
        if (metadata.namespace === namespace && metadata.name === name) {
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
          break
        }
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
