<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container fluid>
    <v-card class="mt-2">
      <v-card-text>
        <h3>Let's get started</h3>
        <div
          v-tooltip:top="{
            text: 'You are not authorized to create projects',
            disabled: canCreateProject
          }"
        >
          <v-btn
            variant="text"
            class="text-left text-primary"
            :disabled="!canCreateProject"
            @click.stop="projectDialog = true"
          >
            <v-icon>mdi-plus</v-icon>
            <span class="ml-2">{{ createProjectBtnText }}</span>
          </v-btn>
        </div>
      </v-card-text>
      <g-project-dialog v-model="projectDialog" />
    </v-card>
  </v-container>
</template>

<script>
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GProjectDialog from '@/components/dialogs/GProjectDialog.vue'

import isEmpty from 'lodash/isEmpty'

export default {
  components: {
    GProjectDialog,
  },
  data () {
    return {
      projectDialog: false,
      projectMenu: false,
    }
  },
  computed: {
    ...mapState(useAuthzStore, ['canCreateProject']),
    ...mapState(useProjectStore, ['projectList']),
    hasProjects () {
      return !isEmpty(this.projectList)
    },
    createProjectBtnText () {
      return this.hasProjects ? 'Create Project' : 'Create your first Project'
    },
  },
  mounted () {
    if (this.$route.path === '/namespace/+') {
      this.projectDialog = true
    }
  },
}
</script>
