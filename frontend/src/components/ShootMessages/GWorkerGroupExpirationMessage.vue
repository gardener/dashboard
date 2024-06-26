<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    Machine image <span class="font-weight-bold">{{ name }} | Version: {{ version }}</span> of worker group <span class="font-weight-bold">{{ workerName }}: </span>
    <span v-if="isValidTerminationDate">
      Image expires
      <g-time-string
        :date-time="expirationDate"
        mode="future"
        date-tooltip
        content-class="font-weight-bold"
      />
      <span>. </span>
    </span>
    <span v-else-if="isExpired">Image is expired. </span>
    <span v-if="severity === 'info'">Version will be updated in the next maintenance window</span>
    <template v-else-if="severity === 'warning'">
      <span v-if="isValidTerminationDate">Machine Image update will be enforced after that date</span>
      <span v-else>Machine Image update will be enforced soon</span>
    </template>
    <template v-else-if="severity === 'error'">
      <div>
        Machine image version
        <span v-if="isExpired">is expired</span>
        <span v-else>will expire soon</span>
        and there is no newer supported version available.
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
    severity: {
      type: String,
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
