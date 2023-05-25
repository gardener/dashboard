<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container fluid>
    <v-card class="mt-2">
      <v-card-text>
        <h3>Let's get started</h3>
        <v-tooltip location="top" :disabled="canCreateProject">
          <template v-slot:activator="{ props }">
            <div v-bind="props">
              <v-btn
                variant="text"
                class="text-left text-primary"
                :disabled="!canCreateProject"
                @click.stop="projectDialog = true"
              >
                <v-icon>mdi-plus</v-icon>
                <span class="ml-2">{{createProjectBtnText}}</span>
              </v-btn>
            </div>
          </template>
          <span>You are not authorized to create projects</span>
        </v-tooltip>
      </v-card-text>
      <g-project-dialog v-model="projectDialog">
      </g-project-dialog>
    </v-card>
  </v-container>
</template>

<script>
import { defineComponent } from 'vue'
import { mapState } from 'pinia'
import {
  useAuthzStore,
  useProjectStore,
} from '@/store'

import isEmpty from 'lodash/isEmpty'

import GProjectDialog from '@/components/dialogs/GProjectDialog.vue'

export default defineComponent({
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
})
</script>
