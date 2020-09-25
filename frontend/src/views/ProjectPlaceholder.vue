<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <component :is="component" v-bind="componentProperties"></component>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import includes from 'lodash/includes'
import ProjectNotFound from '@/views/ProjectNotFound'

export default {
  components: {
    ProjectNotFound
  },
  data () {
    return {
      component: undefined
    }
  },
  computed: {
    ...mapState([
      'namespace'
    ]),
    ...mapGetters([
      'namespaces'
    ]),
    componentProperties () {
      switch (this.component) {
        default:
          return {}
      }
    }
  },
  methods: {
    load (namespace) {
      this.component = 'router-view'
      try {
        if (!includes(this.namespaces, namespace) && namespace !== '_all') {
          throw new Error('Invalid namespace')
        }
      } catch (err) {
        this.component = 'project-not-found'
      }
    }
  },
  watch: {
    '$route.params.namespace' (namespace, oldNamespace) {
      if (namespace !== oldNamespace) {
        this.load(namespace)
      }
    }
  },
  mounted () {
    this.load(this.$route.params.namespace)
  }
}
</script>
