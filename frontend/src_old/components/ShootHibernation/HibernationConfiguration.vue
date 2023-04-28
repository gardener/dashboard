<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    :valid="hibernationScheduleValid"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    width="900"
    caption="Configure Hibernation Schedule">
    <template v-slot:actionComponent>
      <manage-hibernation-schedule
        :key="componentKey"
        :is-hibernation-possible="isHibernationPossible"
        :hibernation-possible-message="hibernationPossibleMessage"
        @valid="onHibernationScheduleValid"
        ref="hibernationSchedule"
        v-on="$hibernationSchedule.hooks"
      ></manage-hibernation-schedule>
    </template>
  </action-button-dialog>
</template>

<script>
import get from 'lodash/get'

import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog.vue'

import { updateShootHibernationSchedules, addShootAnnotation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { v4 as uuidv4 } from '@/utils/uuid'

import shootItem from '@/mixins/shootItem'
import asyncRef from '@/mixins/asyncRef'

const ManageHibernationSchedule = () => import('@/components/ShootHibernation/ManageHibernationSchedule.vue')

export default {
  name: 'hibernation-configuration',
  components: {
    ActionButtonDialog,
    ManageHibernationSchedule
  },
  mixins: [
    shootItem,
    asyncRef('hibernationSchedule')
  ],
  data () {
    return {
      hibernationScheduleValid: false,
      componentKey: uuidv4()
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      await this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        await this.updateConfiguration()
      }
      this.componentKey = uuidv4() // force re-render
    },
    async updateConfiguration () {
      try {
        const noHibernationSchedule = await this.$hibernationSchedule.dispatch('getNoHibernationSchedule')
        const noScheduleAnnotation = {
          'dashboard.garden.sapcloud.io/no-hibernation-schedule': noHibernationSchedule ? 'true' : null
        }
        const scheduleCrontab = await this.$hibernationSchedule.dispatch('getScheduleCrontab')
        await updateShootHibernationSchedules({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: scheduleCrontab
        })
        await addShootAnnotation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: noScheduleAnnotation
        })
      } catch (err) {
        const errorMessage = 'Could not save hibernation configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    async reset () {
      this.hibernationScheduleValid = false

      const noScheduleAnnotation = !!get(this.shootItem, 'metadata.annotations', {})['dashboard.garden.sapcloud.io/no-hibernation-schedule']

      await this.$hibernationSchedule.dispatch('setScheduleData', {
        hibernationSchedule: this.shootHibernationSchedules,
        noHibernationSchedule: noScheduleAnnotation,
        purpose: this.shootPurpose
      })
    },
    onHibernationScheduleValid (value) {
      this.hibernationScheduleValid = value
    },
    showDialog () { // called from ShootLifeCycleCard
      this.$refs.actionDialog.showDialog()
    }
  }
}
</script>
