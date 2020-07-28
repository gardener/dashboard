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
import ShootItemLoading from '@/views/ShootItemLoading'
import ShootItemNotFound from '@/views/ShootItemNotFound'

export default {
  components: {
    ShootItemLoading,
    ShootItemNotFound
  },
  data () {
    return {
      loading: false,
      component: undefined
    }
  },
  computed: {
    componentProperties () {
      switch (this.component) {
        default:
          return {}
      }
    }
  },
  watch: {
    '$route.params' (params, oldParams) {
      console.log(params, oldParams)
      if (params.namespace !== oldParams.namespace || params.name !== oldParams.name) {
        this.load(params)
      }
    }
  },
  mounted () {
    this.load(this.$route.params)
  },
  methods: {
    async load ({ namespace, name }) {
      if (!this.loading) {
        this.loading = true
        this.component = 'shoot-item-loading'
        try {
          await this.$store.dispatch('subscribeShoot', { namespace, name })
          this.component = 'router-view'
        } catch (err) {
          this.component = 'shoot-item-not-found'
        } finally {
          this.loading = false
        }
      }
    }
  }
}
</script>
