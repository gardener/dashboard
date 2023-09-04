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
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GProjectError from '@/views/GProjectError.vue'

export default {
  components: {
    GProjectError,
  },
  beforeRouteEnter (to, from, next) {
    next(vm => vm.load())
  },
  beforeRouteUpdate (to, from) {
    this.load()
  },
  data () {
    return {
      error: null,
      fallbackRoute: null,
    }
  },
  computed: {
    ...mapState(useAuthzStore, [
      'namespace',
      'canGetSecrets',
    ]),
    ...mapState(useProjectStore, [
      'namespaces',
    ]),
    component () {
      if (this.error) {
        return 'g-project-error'
      }
      return 'router-view'
    },
    componentProperties () {
      switch (this.component) {
        case 'g-project-error': {
          const {
            code = 500,
            reason = 'Oops, something went wrong',
            message = 'An unexpected error occurred. Please try again later',
          } = this.error ?? {}
          return {
            code,
            text: reason,
            message,
            fallbackRoute: this.fallbackRoute,
          }
        }
        default: {
          return {}
        }
      }
    },
  },
  methods: {
    load () {
      const routeName = this.$route.name
      this.error = null
      this.fallbackRoute = null
      if (!this.namespaces.includes(this.namespace) && this.namespace !== '_all') {
        this.error = Object.assign(new Error('The project you are looking for doesn\'t exist or you are not authorized to view this project!'), {
          code: 404,
          reason: 'Project not found',
        })
        this.fallbackRoute = {
          name: 'Home',
        }
      } else if (['Secrets', 'Secret'].includes(routeName) && !this.canGetSecrets) {
        this.error = Object.assign(new Error('You do not have the necessary permissions to list secrets!'), {
          code: 403,
          reason: 'Forbidden',
        })
        this.fallbackRoute = {
          name: 'ShootList',
          params: {
            namespace: this.namespace,
          },
        }
      }
    },
  },
}
</script>
