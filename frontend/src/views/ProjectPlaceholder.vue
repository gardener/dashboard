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
import { mapState, mapGetters } from 'vuex'
import includes from 'lodash/includes'
import ProjectNotFound from '@/views/ProjectNotFound'

export default {
  components: {
    ProjectNotFound
  },
  data () {
    return {
      loading: false,
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
  watch: {
    '$route.params.namespace' (namespace, oldNamespace) {
      if (namespace !== oldNamespace) {
        this.load(namespace)
      }
    }
  },
  mounted () {
    this.load(this.$route.params.namespace)
  },
  methods: {
    async load (namespace) {
      if (!this.loading) {
        this.loading = true
        this.component = 'router-view'
        try {
          if (!includes(this.namespaces, namespace) && namespace !== '_all') {
            throw new Error('Invalid namespace')
          }
        } catch (err) {
          this.component = 'project-not-found'
        } finally {
          this.loading = false
        }
      }
    }
  }
}
</script>
