<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    :shoot-item="shootItem"
    :valid="!v$.$invalid"
    width="900"
    caption="Configure Hibernation Schedule"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #actionComponent>
      <g-manage-hibernation-schedule
        :key="componentKey"
        ref="hibernationScheduleRef"
        :is-hibernation-possible="isHibernationPossible"
        :hibernation-possible-message="hibernationPossibleMessage"
      />
    </template>
  </g-action-button-dialog>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'

import { useAsyncRef } from '@/composables/useAsyncRef'

import { errorDetailsFromError } from '@/utils/error'
import { v4 as uuidv4 } from '@/utils/uuid'
import shootItem from '@/mixins/shootItem'

import { get } from '@/lodash'

export default {
  components: {
    GActionButtonDialog,
    GManageHibernationSchedule: defineAsyncComponent(() => import('@/components/ShootHibernation/GManageHibernationSchedule')),
  },
  mixins: [
    shootItem,
  ],
  inject: ['api', 'logger'],
  setup () {
    return {
      ...useAsyncRef('hibernationSchedule'),
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      componentKey: uuidv4(),
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      await this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        if (await this.updateConfiguration()) {
          this.componentKey = uuidv4() // force re-render
        }
      } else {
        this.componentKey = uuidv4() // force re-render
      }
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
        return true
      } catch (err) {
        const errorMessage = 'Could not save hibernation configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        return false
      }
    },
    async reset () {
      const noScheduleAnnotation = !!get(this.shootItem, 'metadata.annotations', {})['dashboard.garden.sapcloud.io/no-hibernation-schedule']

      await this.hibernationSchedule.dispatch('setScheduleData', {
        hibernationSchedule: this.shootHibernationSchedules,
        noHibernationSchedule: noScheduleAnnotation,
        purpose: this.shootPurpose,
      })
    },
    showDialog () { // called from ShootLifeCycleCard
      this.$refs.actionDialog.showDialog()
    },
  },
}
</script>
