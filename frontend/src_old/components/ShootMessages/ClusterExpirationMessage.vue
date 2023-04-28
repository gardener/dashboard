<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <span v-if="isValidTerminationDate">This cluster will self terminate <time-string :date-time="shootExpirationTimestamp" mode="future" no-tooltip class="font-weight-bold"></time-string></span>
    <span v-else>This cluster is about to self terminate</span>
  </div>
</template>

<script>

import { isValidTerminationDate } from '@/utils'
import TimeString from '@/components/TimeString.vue'

export default {
  components: {
    TimeString
  },
  props: {
    shootExpirationTimestamp: {
      type: String,
      required: true
    }
  },
  computed: {
    isValidTerminationDate () {
      return isValidTerminationDate(this.shootExpirationTimestamp)
    }
  }
}
</script>
