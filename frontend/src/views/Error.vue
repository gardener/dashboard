<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-app>
    <v-main>
      <g-error :message="message" @click="goHome"/>
    </v-main>
  </v-app>
</template>

<script>
import GError from '@/components/GError'
import get from 'lodash/get'

export default {
  components: {
    GError
  },
  computed: {
    message () {
      return get(this.$store.state, 'alert.message')
    }
  },
  methods: {
    async goHome () {
      try {
        await this.$router.push({
          name: 'Home'
        })
      } catch (err) {
        /* Catch and ignore navigation aborted errors. Redirection happens in navigation guards (see https://router.vuejs.org/guide/essentials/navigation.html#router-push-location-oncomplete-onabort). */
      }
    }
  }
}
</script>
