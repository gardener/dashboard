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
  <action-icon-dialog
    :shootItem="shootItem"
    :valid="hibernationScheduleValid"
    @dialogOpened="onConfigurationDialogOpened"
    ref="actionDialog"
    caption="Configure Hibernation Schedule">
    <template v-slot:actionComponent>
      <manage-hibernation-schedule
        ref="hibernationSchedule"
        :isHibernationPossible="isHibernationPossible"
        :hibernationPossibleMessage="hibernationPossibleMessage"
        @valid="onHibernationScheduleValid"
      ></manage-hibernation-schedule>
    </template>
  </action-icon-dialog>
</template>

<script>
import ActionIconDialog from '@/components/dialogs/ActionIconDialog'
import ManageHibernationSchedule from '@/components/ShootHibernation/ManageHibernationSchedule'
import { updateShootHibernationSchedules, addShootAnnotation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import get from 'lodash/get'
import { shootItem } from '@/mixins/shootItem'

export default {
  name: 'hibernation-configuration',
  components: {
    ActionIconDialog,
    ManageHibernationSchedule
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  data () {
    return {
      hibernationScheduleValid: false
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        const noScheduleAnnotation = {
          'dashboard.garden.sapcloud.io/no-hibernation-schedule': this.$refs.hibernationSchedule.getNoHibernationSchedule() ? 'true' : null
        }
        await updateShootHibernationSchedules({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: this.$refs.hibernationSchedule.getScheduleCrontab()
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
    reset () {
      this.hibernationScheduleValid = false

      const noScheduleAnnotation = !!get(this.shootItem, 'metadata.annotations', {})['dashboard.garden.sapcloud.io/no-hibernation-schedule']
      this.$refs.hibernationSchedule.setScheduleData({
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
