<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

<template>
  <v-container fluid>
    <v-card class="mt-2">
      <v-card-text>
        <h3>Let's get started</h3>
        <v-tooltip top :disabled="canCreateProject">
          <template v-slot:activator="{ on }">
            <div v-on="on">
              <v-btn
                text
                class="text-left teal--text"
                :disabled="!canCreateProject"
                @click.native.stop="projectDialog = true"
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
import ProjectCreateDialog from '@/components/dialogs/ProjectDialog'

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
