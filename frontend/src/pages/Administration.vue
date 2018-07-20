<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    <v-card class="mr-extra">

      <v-toolbar class="red elevation-0 darken-2" dark>
        <v-icon class="white--text pr-2">mdi-cube</v-icon>
        <v-toolbar-title>Project Details</v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <v-layout row wrap>
          <v-flex lg4 xs12>
            <label class="caption grey--text text--darken-2">Name</label>
            <p class="subheading">{{projectName}}</a></p>
          </v-flex>
          <v-flex lg8 xs12>
            <label class="caption grey--text text--darken-2">Main Contact</label>
            <p class="subheading"><a :href="'mailto:'+owner" class="cyan--text text--darken-2">{{owner}}</a></p>
          </v-flex>
          <v-flex lg4 xs12>
            <v-tooltip top>
              <template slot="activator">
                <label class="caption grey--text text--darken-2">Created At</label>
                <p class="subheading">{{created}}</p>
              </template>
              <time-string :dateTime="metadata.creationTimestamp"></time-string>
            </v-tooltip>
          </v-flex>
          <v-flex lg8 xs12 v-if="projectData.createdBy">
            <label class="caption grey--text text--darken-2">Created By</label>
            <p class="subheading">
              <a :href="'mailto:'+projectData.createdBy" class="cyan--text text--darken-2">{{projectData.createdBy}}</a>
            </p>
          </v-flex>
          <v-flex xs12 >
            <label class="caption grey--text text--darken-2">Description</label>
            <p class="subheading">{{description}}</p>
          </v-flex>
          <v-flex xs12>
            <label class="caption grey--text text--darken-2">Purpose</label>
            <p class="subheading">{{purpose}}</p>
          </v-flex>
        </v-layout>
        <update-dialog v-model="edit" :project="project" mode="update"></update-dialog>
      </v-card-text>
    </v-card>

    <v-speed-dial
      v-model="floatingButton"
      fixed
      bottom
      right
      direction="top"
      transition="slide-y-reverse-transition"
    >
      <v-btn
        slot="activator"
        v-model="floatingButton"
        color="red darken-2"
        dark
        fab
      >
        <v-icon>more_vert</v-icon>
        <v-icon>close</v-icon>
      </v-btn>
      <v-btn
        fab
        dark
        small
        color="red darken-2"
        @click="edit = true">
        <v-icon>edit</v-icon>
      </v-btn>
      <v-tooltip v-if="isDeleteButtonDisabled" top>
        <v-btn
          slot="activator"
          fab
          dark
          small
          color="red lighten-2"
          @click.native.stop>
          <v-icon>delete</v-icon>
        </v-btn>
        <span>You can only delete projects that do not contain clusters</span>
      </v-tooltip>
      <v-btn v-else
        fab
        dark
        small
        color="red darken-2"
        @click="deleteConfirm = true">
        <v-icon>delete</v-icon>
      </v-btn>
    </v-speed-dial>

    <confirm-dialog
      v-model="deleteConfirm"
      defaultColor="red"
      :cancel="hide"
      :ok="onDeleteProject"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage">
      <div slot="caption">
        Confirm Delete
      </div>
      <div slot="message">
        Are you sure to delete the project <b>{{projectName}}</b>?
        <br />
        <i class="red--text text--darken-2">The operation can not be undone.</i>
      </div>
    </confirm-dialog>
  </v-container>
</template>

<script>
  import { mapState, mapGetters, mapActions } from 'vuex'
  import find from 'lodash/find'
  import UpdateDialog from '@/dialogs/ProjectDialog'
  import ConfirmDialog from '@/dialogs/ConfirmDialog'
  import TimeString from '@/components/TimeString'
  import { getDateFormatted } from '@/utils'
  import { errorDetailsFromError } from '@/utils/error'

  export default {
    name: 'administration',
    components: {
      UpdateDialog,
      ConfirmDialog,
      TimeString
    },
    data () {
      return {
        edit: false,
        deleteConfirm: false,
        floatingButton: false,
        errorMessage: undefined,
        detailedErrorMessage: undefined
      }
    },
    computed: {
      ...mapState([
        'namespace'
      ]),
      ...mapGetters([
        'projectList',
        'shootList'
      ]),
      project () {
        const predicate = project => project.metadata.namespace === this.namespace
        return find(this.projectList, predicate) || {}
      },
      projectData () {
        return this.project.data || {}
      },
      metadata () {
        return this.project.metadata || {}
      },
      projectName () {
        return this.metadata.name || ''
      },
      owner () {
        return this.projectData.owner || ''
      },
      created () {
        return getDateFormatted(this.metadata.creationTimestamp)
      },
      description () {
        return this.projectData.description || ''
      },
      purpose () {
        return this.projectData.purpose || ''
      },
      isDeleteButtonDisabled () {
        return this.shootList.length > 0
      }
    },
    methods: {
      ...mapActions([
        'deleteProject'
      ]),
      hide () {
        this.errorMessage = undefined
        this.detailedMessage = undefined
        this.deleteConfirm = false
        this.edit = false
        this.floatingButton = false
      },
      onDeleteProject () {
        this
          .deleteProject(this.project)
          .then(() => {
            this.hide()
            if (this.projectList.length > 0) {
              const p1 = this.projectList[0]
              this.$router.push({name: 'ShootList', params: { namespace: p1.metadata.namespace }})
            } else {
              this.$router.push({name: 'Home', params: { }})
            }
          })
          .catch(err => {
            this.errorMessage = 'Failed to delete project.'

            const errorDetails = errorDetailsFromError(err)
            console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
            this.detailedErrorMessage = errorDetails.detailedMessage
          })
      }
    },
    created () {
      this.$bus.$on('esc-pressed', () => {
        this.hide()
      })
    }
  }
</script>
