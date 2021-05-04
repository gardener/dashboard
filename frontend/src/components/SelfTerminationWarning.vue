<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip top v-if="expirationTimestamp">
    <template v-slot:activator="{ on }">
      <v-icon v-on="on" color="warning" class="terminationIcon" v-if="isSelfTerminationWarning">mdi-clock-alert</v-icon>
      <v-icon v-on="on" color="primary" class="terminationIcon" v-else>mdi-clock</v-icon>
    </template>
    <span v-if="isValidTerminationDate">This cluster will self terminate <span class="font-weight-bold"><time-string :date-time="expirationTimestamp" mode="future"></time-string></span></span>
    <span v-else>This cluster is about to self terminate</span>
  </v-tooltip>
</template>

<script>
import TimeString from '@/components/TimeString'
import { isSelfTerminationWarning, isValidTerminationDate } from '@/utils'

export default {
  name: 'selfTerminationWarning',
  components: {
    TimeString
  },
  props: {
    expirationTimestamp: {
      type: String
    }
  },
  computed: {
    isValidTerminationDate () {
      return isValidTerminationDate(this.expirationTimestamp)
    },
    isSelfTerminationWarning () {
      return isSelfTerminationWarning(this.expirationTimestamp)
    }
  }
}
</script>

<style lang="scss" scoped>
  .terminationIcon {
    margin-left: 10px;
  }
</style>
