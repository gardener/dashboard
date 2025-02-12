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

import isEqual from 'lodash/isEqual'

function isLoadRequired (route, to) {
  return route.name !== to.name || !isEqual(route.params, to.params)
}

export default {
  components: {
    GProjectError,
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      if (isLoadRequired(vm.$route, to)) {
        vm.load(to)
      }
    })
  },
  beforeRouteUpdate (to, from) {
    if (isLoadRequired(this.$route, to)) {
      this.load(to)
    }
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
      'canGetCloudProviderCredentials',
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
  mounted () {
    this.load(this.$route)
  },
  methods: {
    load (route) {
      this.error = null
      this.fallbackRoute = null
      const routeName = route.name
      const routeParams = route.params
      if (this.namespace !== routeParams.namespace) {
        this.error = new Error('An unexpected error occurred')
        this.fallbackRoute = {
          name: 'Home',
        }
      } else if (!this.namespaces.includes(this.namespace) && this.namespace !== '_all') {
        this.error = Object.assign(new Error('The project you are looking for doesn\'t exist or you are not authorized to view this project!'), {
          code: 404,
          reason: 'Project not found',
        })
        this.fallbackRoute = {
          name: 'Home',
        }
      } else if (['Credentials', 'Credential'].includes(routeName) && !this.canGetCloudProviderCredentials) {
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
