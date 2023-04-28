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
          <template v-slot:activator="{ on }">
            <div v-on="on">
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
      <project-create-dialog v-model="projectDialog">
      </project-create-dialog>
    </v-card>
  </v-container>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import isEmpty from 'lodash/isEmpty'
import ProjectCreateDialog from '@/components/dialogs/ProjectDialog.vue'

export default {
  name: 'profile',
  components: {
    ProjectCreateDialog
  },
  data () {
    return {
      projectDialog: false,
      projectMenu: false
    }
  },
  computed: {
    ...mapState([
      'user'
    ]),
    ...mapGetters([
      'username',
      'canCreateProject',
      'namespaces',
      'projectList'
    ]),
    hasProjects () {
      return !isEmpty(this.projectList)
    },
    createProjectBtnText () {
      return this.hasProjects ? 'Create Project' : 'Create your first Project'
    }
  },
  mounted () {
    if (this.$route.path === '/namespace/+') {
      this.projectDialog = true
    }
  }
}
</script>
