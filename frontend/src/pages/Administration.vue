<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
        <v-spacer></v-spacer>
        <v-tooltip top>
          <v-btn :disabled="isDeleteButtonDisabled" icon @click.native.stop="showDialog" slot="activator">
            <v-icon>delete</v-icon>
          </v-btn>
          <span v-if="isDeleteButtonDisabled">You can only delete projects that do not contain clusters</span>
          <span v-else>Delete Project</span>
        </v-tooltip>
      </v-toolbar>

      <v-card-text>
        <v-layout row wrap>
          <v-flex lg4 xs12>
            <label class="caption grey--text text--darken-2">Name</label>
            <p class="subheading">{{projectName}}</p>
          </v-flex>
          <v-flex lg8 xs12>
            <label class="caption grey--text text--darken-2">Main Contact</label>
            <p class="subheading"><account-avatar :account-name="owner" :mail-to="true"></account-avatar></p>
          </v-flex>
          <v-flex lg4 xs12>
            <v-tooltip top>
              <template slot="activator">
                <label class="caption grey--text text--darken-2">Created At</label>
                <p class="subheading">{{created}}</p>
              </template>
              <time-string :dateTime="metadata.creationTimestamp" :pointInTime="-1"></time-string>
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
    <v-fab-transition>
      <v-btn fixed dark fab bottom right v-show="floatingButton" class="red darken-2" @click.native.stop="edit = true">
        <v-icon>edit</v-icon>
      </v-btn>
    </v-fab-transition>

    <g-dialog
      defaultColor="red"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
      ref="gDialog">
      <template slot="caption">
        Confirm Delete
      </template>
      <template slot="message">
        Are you sure to delete the project <b>{{projectName}}</b>?
        <br />
        <i class="red--text text--darken-2">The operation can not be undone.</i>
      </template>
    </g-dialog>
  </v-container>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import find from 'lodash/find'
import AccountAvatar from '@/components/AccountAvatar'
import UpdateDialog from '@/dialogs/ProjectDialog'
import GDialog from '@/dialogs/GDialog'
import TimeString from '@/components/TimeString'
import { getDateFormatted } from '@/utils'
import { errorDetailsFromError } from '@/utils/error'

export default {
  name: 'administration',
  components: {
    AccountAvatar,
    UpdateDialog,
    GDialog,
    TimeString
  },
  data () {
    return {
      edit: false,
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
    async showDialog () {
      this.$refs.gDialog.showDialog()

      const confirmed = await this.$refs.gDialog.confirmWithDialog()
      if (confirmed) {
        try {
          await this.deleteProject(this.project)
          if (this.projectList.length > 0) {
            const p1 = this.projectList[0]
            this.$router.push({ name: 'ShootList', params: { namespace: p1.metadata.namespace } })
          } else {
            this.$router.push({ name: 'Home', params: { } })
          }
        } catch (err) {
          const errorDetails = errorDetailsFromError(err)
          this.errorMessage = 'Failed to delete project'
          this.detailedErrorMessage = errorDetails.detailedMessage
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
          this.showDialog()
        }
      }
    },
    reset () {
      this.errorMessage = undefined
      this.detailedMessage = undefined
      this.edit = false
    }
  },
  mounted () {
    this.floatingButton = true
  }
}
</script>
