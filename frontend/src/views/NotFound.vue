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
  <g-error
    code="404"
    text="Looks like you're lost"
    message="The page you are looking for is not available!"
    buttonText="Get me out of here"
    @click="onClick"
  ></g-error>
</template>

<script>
import GError from '@/components/GError'
import get from 'lodash/get'

export default {
  components: {
    GError
  },
  computed: {
    fallbackRoute () {
      const defaultNamespace = this.$store.getters.defaultNamespace
      const namespace = get(this.$route, 'params.namespace', defaultNamespace)
      const name = get(this.$route, 'params.name')
      if (namespace) {
        if (name) {
          return {
            name: 'ShootItem',
            params: {
              namespace,
              name
            }
          }
        }
        return {
          name: 'ShootList',
          params: {
            namespace
          }
        }
      }
      return {
        name: 'Home'
      }
    }
  },
  methods: {
    async onClick ({ name } = {}) {
      if (!name) {
        try {
          await this.$router.push(this.fallbackRoute)
        } catch (err) {
          /* Catch and ignore navigation aborted errors. Redirection happens in navigation guards (see https://router.vuejs.org/guide/essentials/navigation.html#router-push-location-oncomplete-onabort). */
        }
      } else {
        this.$router.back()
      }
    }
  }
}
</script>
