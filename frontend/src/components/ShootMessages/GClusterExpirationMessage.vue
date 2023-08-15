<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <span v-if="isValidTerminationDate">This cluster will self terminate
      <g-time-string
        :date-time="shootExpirationTimestamp"
        mode="future"
        no-tooltip
        class="font-weight-bold"
      />
    </span>
    <span v-else>This cluster is about to self terminate</span>
  </div>
</template>

<script>
import GTimeString from '@/components/GTimeString.vue'

import { isValidTerminationDate } from '@/utils'

export default {
  components: {
    GTimeString,
  },
  props: {
    shootExpirationTimestamp: {
      type: String,
      required: true,
    },
  },
  computed: {
    isValidTerminationDate () {
      return isValidTerminationDate(this.shootExpirationTimestamp)
    },
  },
}
</script>
