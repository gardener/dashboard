<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top" v-if="staleSinceTimestamp">
    <template v-slot:activator="{ on }">
      <v-icon :size="small && 'small'" v-on="on" :color="color" class="ml-1" v-if="staleAutoDeleteTimestamp">mdi-delete-clock</v-icon>
      <v-icon :size="small && 'small'" v-on="on" :color="color" class="ml-1" v-else>mdi-clock-alert-outline</v-icon>
    </template>
    <span v-if="staleAutoDeleteTimestamp">
      This is a <span class="font-weight-bold">stale</span> project. Gardener will auto delete this project <time-string :date-time="staleAutoDeleteTimestamp" mode="future" no-tooltip content-class="font-weight-bold"></time-string>
    </span>
    <span v-else>
      This project is considered <span class="font-weight-bold">stale</span> since <time-string :date-time="staleSinceTimestamp" without-prefix-or-suffix no-tooltip content-class="font-weight-bold"></time-string>
    </span>
  </v-tooltip>
</template>

<script>
import { getProjectDetails } from '@/utils'
import TimeString from '@/components/TimeString.vue'

export default {
  name: 'staleProjectWarning',
  components: {
    TimeString
  },
  props: {
    project: {
      type: Object,
      default: null
    },
    small: {
      type: Boolean
    },
    color: {
      type: String,
      default: 'primary'
    }
  },
  computed: {
    projectDetails () {
      return getProjectDetails(this.project)
    },
    staleSinceTimestamp () {
      return this.projectDetails.staleSinceTimestamp
    },
    staleAutoDeleteTimestamp () {
      return this.projectDetails.staleAutoDeleteTimestamp
    }
  }
}
</script>
