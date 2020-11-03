<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <g-error
    :code="code"
    :text="text"
    :message="message"
    :buttonText="buttonText"
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
  props: {
    code: {
      type: [String, Number],
      default: '404'
    },
    text: {
      type: String,
      default: 'Cluster not found'
    },
    message: {
      type: String,
      default: 'The cluster you are looking for doesn\'t exist or an other error occured!'
    },
    buttonText: {
      type: String,
      default: 'Back to cluster list'
    }
  },
  computed: {
    fallbackRoute () {
      const defaultNamespace = this.$store.getters.defaultNamespace
      const namespace = get(this.$route, 'params.namespace', defaultNamespace)
      if (namespace) {
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
    async onClick () {
      try {
        this.$router.push(this.fallbackRoute)
      } catch (err) {
        /* Catch and ignore navigation aborted errors. Redirection happens in navigation guards (see https://router.vuejs.org/guide/essentials/navigation.html#router-push-location-oncomplete-onabort). */
      }
    }
  }
}
</script>
