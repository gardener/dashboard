<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <span v-if="isValidTerminationDate()">This cluster will self terminate <span class="font-weight-bold"><time-string :date-time="shootExpirationTimestamp" mode="future"></time-string></span></span>
    <span v-else>This cluster is about to self terminate</span>
  </div>
</template>

<script>

import { isValidTerminationDate } from '@/utils'
import TimeString from '@/components/TimeString'

export default {
  name: 'ClusterExpirationMessage',
  components: {
    TimeString
  },
  props: {
    shootExpirationTimestamp: {
      type: String,
      required: true
    }
  },
  methods: {
    isValidTerminationDate () {
      return isValidTerminationDate(this.shootExpirationTimestamp)
    }
  }
}
</script>
