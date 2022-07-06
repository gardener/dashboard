<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip top v-if="projectDetails.isNotReady">
    <template v-slot:activator="{ on }">
      <v-icon v-if="projectDetails.phase === 'Terminating'" :small="small" v-on="on" color="primary" class="ml-1">mdi-delete-sweep</v-icon>
      <v-icon v-else-if="projectDetails.phase === 'Initial'" :small="small" v-on="on" color="primary" class="ml-1">mdi-plus-circle-outline</v-icon>
      <v-icon v-else :small="small" v-on="on" color="warning" class="ml-1">mdi-alert-circle-outline</v-icon>
    </template>
    <div>
      The project phase is <v-chip color="primary" label x-small>{{projectDetails.phase}}</v-chip>
    </div>
    <div>
      <span v-if="projectDetails.phase === 'Terminating'">Gardener is currently cleaning up BackupEntries related to this project. The project will be removed when all cleanup activity has been finished.</span>
      <span v-else-if="projectDetails.phase === 'Initial'">The project is currently beeing created and may not yet be ready to be used.</span>
      <span v-else>The project is in an unready state. The project might not be functional.</span>
    </div>
  </v-tooltip>
</template>

<script>
import { getProjectDetails } from '@/utils'

export default {
  name: 'notReadyProjectWarning',
  props: {
    project: {
      type: Object
    },
    small: {
      type: Boolean
    }
  },
  computed: {
    projectDetails () {
      return getProjectDetails(this.project)
    }
  }
}
</script>

<style lang="scss" scoped>
  .staleIcon {
    margin-left: 10px;
  }
</style>
