<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <component :is="component" v-bind="componentProperties"></component>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import includes from 'lodash/includes'
import ProjectError from '@/views/ProjectError.vue'

export default {
  components: {
    ProjectError
  },
  data () {
    return {
      error: undefined,
      component: undefined,
      fallbackRoute: undefined
    }
  },
  computed: {
    ...mapState([
      'namespace'
    ]),
    ...mapGetters([
      'namespaces',
      'canGetSecrets'
    ]),
    componentProperties () {
      switch (this.component) {
        case 'project-error': {
          const {
            code = 500,
            reason = 'Oops, something went wrong',
            message = 'An unexpected error occurred. Please try again later'
          } = this.error
          const fallbackRoute = this.fallbackRoute
          return { code, text: reason, message, fallbackRoute }
        }
        default:
          return {}
      }
    }
  },
  methods: {
    load ({ name, params: { namespace } = {} }) {
      this.error = undefined
      this.fallbackRoute = undefined
      this.component = 'router-view'
      try {
        if (!includes(this.namespaces, namespace) && namespace !== '_all') {
          this.fallbackRoute = {
            name: 'Home'
          }
          throw Object.assign(new Error('The project you are looking for doesn\'t exist or you are not authorized to view this project!'), {
            code: 404,
            reason: 'Project not found'
          })
        }
        if (includes(['Secrets', 'Secret'], name) && !this.canGetSecrets) {
          this.fallbackRoute = {
            name: 'ShootList',
            params: {
              namespace
            }
          }
          throw Object.assign(new Error('You do not have the necessary permissions to list secrets!'), {
            code: 403,
            reason: 'Forbidden'
          })
        }
      } catch (err) {
        this.error = err
        this.component = 'project-error'
      }
    }
  },
  watch: {
    '$route' (value) {
      this.load(value)
    }
  },
  mounted () {
    this.load(this.$route)
  }
}
</script>
