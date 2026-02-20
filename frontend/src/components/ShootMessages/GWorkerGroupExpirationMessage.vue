<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    Machine image <span class="font-weight-bold">{{ name }} | version {{ version }}</span> of worker group <span class="font-weight-bold">{{ workerName }}</span>
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
    <span v-else-if="isExpired"> is expired. </span>
    <span v-else>will expire soon. </span>
    <span v-if="regularUpdate">Version will be updated in the next maintenance window</span>
    <template v-else-if="forcedUpdate">
      <span v-if="isValidTerminationDate">Machine Image update will be enforced after that date</span>
      <span v-else>Machine Image update will be enforced soon</span>
    </template>
    <template v-else-if="noUpdate">
      <div>
        There is no supported version available that you can update to.
      </div>
      <div v-if="supportedVersionAvailable">
        However, an older <code>supported</code> version for this image vendor is available. You may want to consider downgrading to that version.
      </div>
      <div v-else>
        Please choose another operating system.
      </div>
    </template>
  </div>
</template>

<script>

import GTimeString from '@/components/GTimeString.vue'

import { getDateFormatted } from '@/utils'

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
    name: {
      type: String,
      required: true,
    },
    workerName: {
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
    supportedVersionAvailable: {
      type: Boolean,
      required: true,
    },
    isExpired: {
      type: Boolean,
      required: true,
    },
  },
  methods: {
    getDateFormatted (date) {
      return getDateFormatted(date)
    },
  },
}
</script>
