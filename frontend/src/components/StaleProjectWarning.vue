<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip top v-if="staleSinceTimestamp">
    <template v-slot:activator="{ on }">
      <v-icon :small="small" v-on="on" :color="color" class="staleIcon" v-if="staleAutoDeleteTimestamp">mdi-delete-clock</v-icon>
      <v-icon :small="small" v-on="on" :color="color" class="staleIcon" v-else>mdi-clock-alert-outline</v-icon>
    </template>
     <span v-if="staleAutoDeleteTimestamp">
      This is a <span class="font-weight-bold">stale</span> project. Gardener will auto delete this project <span class="font-weight-bold"><time-string :date-time="staleAutoDeleteTimestamp" mode="future"></time-string></span>
    </span>
    <span v-else>
      This project is considered <span class="font-weight-bold">stale</span> since <span class="font-weight-bold"><time-string :date-time="staleSinceTimestamp" withoutPrefixOrSuffix></time-string></span>
    </span>
  </v-tooltip>
</template>

<script>
import { getProjectDetails } from '@/utils'
import TimeString from '@/components/TimeString'

export default {
  name: 'staleProjectWarning',
  components: {
    TimeString
  },
  props: {
    project: {
      type: Object
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

<style lang="scss" scoped>
  .staleIcon {
    margin-left: 10px;
  }
</style>
