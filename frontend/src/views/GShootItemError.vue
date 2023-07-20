<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-error
    :code="code"
    :text="text"
    :message="message"
    :button-text="buttonText"
    @click="onClick"
  />
</template>

<script>
import { defineComponent } from 'vue'
import { mapState } from 'pinia'

import { useProjectStore } from '@/store'
import GError from '@/components/GError.vue'

import get from 'lodash/get'

export default defineComponent({
  components: {
    GError,
  },
  props: {
    code: {
      type: [String, Number],
      default: '404',
    },
    text: {
      type: String,
      default: 'Cluster not found',
    },
    message: {
      type: String,
      default: 'The cluster you are looking for doesn\'t exist or an other error occured!',
    },
    buttonText: {
      type: String,
      default: 'Back to cluster list',
    },
  },
  computed: {
    ...mapState(useProjectStore, [
      'defaultNamespace',
    ]),
    fallbackRoute () {
      const namespace = get(this.$route, 'params.namespace', this.defaultNamespace)
      if (namespace) {
        return {
          name: 'ShootList',
          params: {
            namespace,
          },
        }
      }
      return {
        name: 'Home',
      }
    },
  },
  methods: {
    async onClick () {
      try {
        await this.$router.push(this.fallbackRoute)
      } catch (err) {
        /* Catch and ignore navigation aborted errors. Redirection happens in navigation guards (see https://router.vuejs.org/guide/essentials/navigation.html#router-push-location-oncomplete-onabort). */
      }
    },
  },
})
</script>
