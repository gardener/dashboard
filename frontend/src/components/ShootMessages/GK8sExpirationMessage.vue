<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <span v-if="isValidTerminationDate">Kubernetes version of this cluster expires
      <g-time-string
        :date-time="expirationDate"
        mode="future"
        date-tooltip
        content-class="font-weight-bold"
      />
      <span>. </span>
    </span>
    <span v-else-if="isExpired">Kubernetes version of this cluster is expired.</span>
    <span v-if="severity === 'info'">Version will be updated in the next maintenance window</span>
    <template v-else-if="severity === 'warning'">
      <span v-if="isValidTerminationDate">Version update will be enforced after that date</span>
      <span v-else>Version update will be enforced soon</span>
    </template>
    <span v-else-if="severity === 'error'">Kubernetes version of this cluster will expire soon and there is no newer supported version available. Please contact your landscape administrator</span>
  </div>
</template>

<script>
import GTimeString from '@/components/GTimeString.vue'

export default {
  components: {
    GTimeString,
  },
  props: {
    expirationDate: {
      type: String,
    },
    isValidTerminationDate: {
      type: Boolean,
      required: true,
    },
    severity: {
      type: String,
      required: true,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
