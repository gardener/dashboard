<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    Kubernetes <span class="font-weight-bold">version {{ version }}</span> of this cluster
    <span v-if="isValidTerminationDate">
      expires
      <g-time-string
        :date-time="expirationDate"
        mode="future"
        date-tooltip
        content-class="font-weight-bold"
      />
      <span>. </span>
    </span>
    <span v-else-if="isExpired">is expired. </span>
    <span v-else>will expire soon. </span>
    <span v-if="regularUpdate">Version will be updated in the next maintenance window</span>
    <template v-else-if="forcedUpdate">
      <span v-if="isValidTerminationDate">Version update will be enforced after that date</span>
      <span v-else>Version update will be enforced soon</span>
    </template>
    <span v-else-if="noUpdate">There is no supported version available that you can update to. Please contact your landscape administrator</span>
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
    version: {
      type: String,
      required: true,
    },
    regularUpdate: {
      type: Boolean,
      required: true,
    },
    forcedUpdate: {
      type: Boolean,
      required: true,
    },
    noUpdate: {
      type: Boolean,
      required: true,
    },
    isExpired: {
      type: Boolean,
      required: true,
    },
  },
}
</script>
