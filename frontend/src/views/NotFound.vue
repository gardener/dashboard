<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
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
