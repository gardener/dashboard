<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    Machine image <span class="font-weight-bold">{{name}} | Version: {{version}}</span> of worker group <span class="font-weight-bold">{{workerName}} </span>
    <span v-if="isValidTerminationDate">expires
      <time-string :date-time="expirationDate" mode="future" date-tooltip content-class="font-weight-bold"></time-string>
      <span>. </span>
    </span>
    <span v-else>is expired. </span>
    <span v-if="severity === 'info'">Version will be updated in the next maintenance window</span>
    <template v-else-if="severity === 'warning'">
      <span v-if="isValidTerminationDate">Machine Image update will be enforced after that date</span>
      <span v-else>Machine Image update will be enforced soon</span>
    </template>
    <span v-else-if="severity === 'error'">Machine Image update not possible as no newer version is available. Please choose another operating system</span>
  </div>
</template>

<script>

import { getDateFormatted } from '@/utils'
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
    version: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    workerName: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      required: true
    }
  },
  methods: {
    getDateFormatted (date) {
      return getDateFormatted(date)
    }
  }
}
</script>
