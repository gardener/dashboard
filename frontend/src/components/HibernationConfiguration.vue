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
  <div>
    <v-tooltip top>
      <v-btn slot="activator" icon @click="showDialog" :disabled="isShootMarkedForDeletion">
        <v-icon medium>{{icon}}</v-icon>
      </v-btn>
      {{caption}}
    </v-tooltip>
    <confirm-dialog
      confirmButtonText="Save"
      :confirm-disabled="!valid"
      v-model="dialog"
      :cancel="hideDialog"
      :ok="updateHibernationSchedules"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
      confirmColor="orange"
      defaultColor="orange"
      max-width=850
      >
      <template slot="caption">{{caption}}</template>
      <template slot="affectedObjectName">{{shootName}}</template>
      <template slot="message">
        <v-layout row wrap>
          <hibernation-schedule
            ref="hibernationSchedule"
            :scheduleCrontab="hibernationSchedules"
            :noSchedule="noScheduleAnnotation"
            :purpose="shootPurpose"
            @valid="onHibernationScheduleValid"
          ></hibernation-schedule>
        </v-layout>
      </template>
    </confirm-dialog>
  </div>
</template>

<script>
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import HibernationSchedule from '@/components/HibernationSchedule'
import { updateHibernationSchedules, addShootAnnotation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { isShootMarkedForDeletion } from '@/utils'
import get from 'lodash/get'

export default {
  name: 'hibernation-configuration',
  components: {
    ConfirmDialog,
    HibernationSchedule
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  data () {
    return {
      dialog: false,
      errorMessage: null,
      detailedErrorMessage: null,
      hibernationScheduleValid: false,
      hibernationSchedules: undefined,
      noScheduleAnnotation: false,
      caption: 'Configure Hibernation Schedule',
      icon: 'mdi-settings-outline'
    }
  },
  computed: {
    shootName () {
      return get(this.shootItem, 'metadata.name')
    },
    shootPurpose () {
      return get(this.shootItem, 'metadata.annotations', {})['garden.sapcloud.io/purpose']
    },
    shootNamespace () {
      return get(this.shootItem, 'metadata.namespace')
    },
    valid () {
      return this.hibernationScheduleValid
    },
    isShootMarkedForDeletion () {
      return isShootMarkedForDeletion(get(this.shootItem, 'metadata'))
    }
  },
  methods: {
    showDialog () {
      this.dialog = true

      this.reset()
    },
    hideDialog () {
      this.dialog = false
    },
    async updateHibernationSchedules () {
      try {
        const noScheduleAnnotation = {
          'dashboard.garden.sapcloud.io/no-hibernation-schedule': this.$refs.hibernationSchedule.getNoHibernationSchedule() ? 'true' : null
        }
        this.hibernationSchedules = this.$refs.hibernationSchedule.getScheduleCrontab()
        await updateHibernationSchedules({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: this.hibernationSchedules
        })
        await addShootAnnotation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: noScheduleAnnotation
        })
        this.hideDialog()
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        this.errorMessage = 'Could not save hibernation configuration'
        this.detailedErrorMessage = errorDetails.detailedMessage
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.errorMessage = null
      this.detailedErrorMessage = null
      this.hibernationScheduleValid = false

      this.hibernationSchedules = get(this.shootItem, 'spec.hibernation.schedules')
      this.noScheduleAnnotation = !!get(this.shootItem, 'metadata.annotations', {})['dashboard.garden.sapcloud.io/no-hibernation-schedule']

      this.$nextTick(() => {
        this.$refs.hibernationSchedule.reset()
      })
    },
    onUpdateHibernationSchedules (value) {
      this.hibernationSchedules = value
    },
    onHibernationScheduleValid (value) {
      this.hibernationScheduleValid = value
    }
  }
}
</script>
