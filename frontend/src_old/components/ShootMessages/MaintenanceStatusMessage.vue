<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div>
      <span class="font-weight-bold">Maintenance last triggered on:</span>
      {{ timeString }}
     </div>
    <div>
      <span class="font-weight-bold">Result: </span>
      <span :class="stateColorClass">{{ state }}</span>
    </div>
    <div>
      <span class="font-weight-bold">Last action:</span>
      {{ description }}
    </div>
    <div v-if="failureReason">
      <span class="font-weight-bold">Failure reason:</span>
      {{ failureReason }}
    </div>
  </div>
</template>

<script>

import { getTimestampFormatted } from '@/utils'

export default {
  props: {
    triggeredTime: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    failureReason: {
      type: String,
      required: false
    }
  },
  computed: {
    stateColorClass () {
      if (this.state === 'Failed') {
        return 'error--text'
      }
      return ''
    },
    timeString () {
      return getTimestampFormatted(this.triggeredTime)
    }
  }
}
</script>
