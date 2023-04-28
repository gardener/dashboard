<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top" v-if="projectDetails.phase !== 'Ready'">
    <template v-slot:activator="{ on }">
      <v-icon v-if="projectDetails.phase === 'Terminating'" :size="small && 'small'" v-on="on" color="primary" class="ml-1">mdi-delete-sweep</v-icon>
      <v-icon v-else-if="projectDetails.phase === 'Pending'" :size="small && 'small'" v-on="on" color="primary" class="ml-1">mdi-plus-circle-outline</v-icon>
      <v-icon v-else :size="small && 'small'" v-on="on" color="warning" class="ml-1">mdi-alert-circle-outline</v-icon>
    </template>
    <div>
      The project phase is <v-chip color="primary" label x-small class="px-1">{{projectDetails.phase}}</v-chip>
    </div>
    <div class="text-caption">
      <span v-if="projectDetails.phase === 'Terminating'">Gardener is currently cleaning up BackupEntries related to this project. The project will be removed when all cleanup activity has been finished.</span>
      <span v-else-if="projectDetails.phase === 'Pending'">The project is currently being created and may not yet be ready to be used.</span>
      <span v-else>The project is in an unready state. The project might not be functional.</span>
    </div>
  </v-tooltip>
</template>

<script>
import { getProjectDetails } from '@/utils'

export default {
  name: 'not-ready-project-warning',
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
