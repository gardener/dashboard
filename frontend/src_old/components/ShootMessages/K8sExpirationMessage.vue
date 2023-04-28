<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <span v-if="isValidTerminationDate">Kubernetes version of this cluster expires
       <time-string :date-time="expirationDate" mode="future" date-tooltip content-class="font-weight-bold"></time-string>
       <span>. </span>
    </span>
    <span v-else>Kubernetes version of this cluster is expired.</span>
    <span v-if="severity === 'info'">Version will be updated in the next maintenance window</span>
    <template v-else-if="severity === 'warning'">
      <span v-if="isValidTerminationDate">Version update will be enforced after that date</span>
      <span v-else>Version update will be enforced soon</span>
    </template>
    <span v-else-if="severity === 'error'">Version update not possible due to missing update path. Please contact your landscape administrator</span>
  </div>
</template>

<script>

import TimeString from '@/components/TimeString.vue'

export default {
  components: {
    TimeString
  },
  props: {
    expirationDate: {
      type: String,
      required: true
    },
    isValidTerminationDate: {
      type: Boolean,
      required: true
    },
    severity: {
      type: String,
      required: true
    }
  }
}
</script>
