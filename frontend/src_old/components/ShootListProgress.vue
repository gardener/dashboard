<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-progress-linear
    absolute
    :indeterminate="indeterminate"
    :color="color"
    :model-value="value"
    :striped="striped"
  >
  </v-progress-linear>
</template>

<script>
import { shootSubscription } from '@/mixins/shootSubscription'

export default {
  name: 'shoot-list-progess',
  mixins: [shootSubscription],
  computed: {
    indeterminate () {
      return this.kind.startsWith('progress')
    },
    striped () {
      return this.kind === 'alert-connect'
    },
    value () {
      return this.kind === 'alert-connect' ? 100 : 0
    }
  }
}
</script>
