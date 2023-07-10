<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :shoot-item="shootItem"
    :valid="hibernationScheduleValid"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    width="900"
    caption="Configure Hibernation Schedule">
    <template v-slot:actionComponent>
      <g-manage-hibernation-schedule
        :key="componentKey"
        :is-hibernation-possible="isHibernationPossible"
        :hibernation-possible-message="hibernationPossibleMessage"
        @valid="onHibernationScheduleValid"
        ref="hibernationScheduleRef"
      ></g-manage-hibernation-schedule>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { defineComponent, defineAsyncComponent } from 'vue'

import get from 'lodash/get'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'

import { errorDetailsFromError } from '@/utils/error'
import { v4 as uuidv4 } from '@/utils/uuid'

import shootItem from '@/mixins/shootItem'
import { useAsyncRef } from '@/composables'

export default defineComponent({
  setup () {
    return {
      ...useAsyncRef('hibernationSchedule'),
    }
  },
  components: {
    GActionButtonDialog,
    GManageHibernationSchedule: defineAsyncComponent(() => import('@/components/ShootHibernation/GManageHibernationSchedule')),
  },
  inject: ['api'],
  mixins: [
    shootItem,
  ],
  data () {
    return {
      hibernationScheduleValid: false,
      componentKey: uuidv4(),
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
        const noHibernationSchedule = await this.hibernationSchedule.dispatch('getNoHibernationSchedule')
        const noScheduleAnnotation = {
          'dashboard.garden.sapcloud.io/no-hibernation-schedule': noHibernationSchedule ? 'true' : null,
        }
        const scheduleCrontab = await this.hibernationSchedule.dispatch('getScheduleCrontab')
        await this.api.updateShootHibernationSchedules({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: scheduleCrontab,
        })
        await this.api.addShootAnnotation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: noScheduleAnnotation,
        })
      } catch (err) {
        const errorMessage = 'Could not save hibernation configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    async reset () {
      this.hibernationScheduleValid = false

      const noScheduleAnnotation = !!get(this.shootItem, 'metadata.annotations', {})['dashboard.garden.sapcloud.io/no-hibernation-schedule']

      await this.hibernationSchedule.dispatch('setScheduleData', {
        hibernationSchedule: this.shootHibernationSchedules,
        noHibernationSchedule: noScheduleAnnotation,
        purpose: this.shootPurpose,
      })
    },
    onHibernationScheduleValid (value) {
      this.hibernationScheduleValid = value
    },
    showDialog () { // called from ShootLifeCycleCard
      this.$refs.actionDialog.showDialog()
    },
  },
})
</script>
