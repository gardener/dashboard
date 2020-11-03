<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <g-error
    code="404"
    text="Project not found"
    message="The project you are looking for doesn't exist or an other error occured!"
    buttonText="Get me out of here"
    @click="onClick"
  ></g-error>
</template>

<script>
import GError from '@/components/GError'

export default {
  components: {
    GError
  },
  methods: {
    async onClick () {
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
