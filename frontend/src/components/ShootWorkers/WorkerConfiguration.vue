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
  <action-icon-dialog
    :shootItem="shootItem"
    :valid="workersValid"
    @onDialogVisible="configurationDialogVisible"
    ref="actionDialog"
    caption="Configure Workers">
    <template slot="actionComponent">
      <manage-workers
      ref="manageWorkers"
      @valid="onWorkersValid"
     ></manage-workers>
    </template>
  </action-icon-dialog>
</template>

<script>
import ActionIconDialog from '@/dialogs/ActionIconDialog'
import ManageWorkers from '@/components/ShootWorkers/ManageWorkers'
import { updateShootWorkers } from '@/utils/api'
import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

export default {
  name: 'worker-configuration',
  components: {
    ActionIconDialog,
    ManageWorkers
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  data () {
    return {
      workersValid: false,
      workers: undefined
    }
  },
  mixins: [shootItem],
  methods: {
    async configurationDialogVisible () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForActionConfirmed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        const workers = this.$refs.manageWorkers.getWorkers()
        await updateShootWorkers({ namespace: this.shootNamespace, name: this.shootName, infrastructureKind: this.shootCloudProviderKind, data: workers })
      } catch (err) {
        const errorMessage = 'Could not save worker configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.workersValid = false

      const workers = this.shootWorkerGroups
      this.$nextTick(() => {
        this.$refs.manageWorkers.setWorkersData({ workers, cloudProfileName: this.shootCloudProfileName, zones: this.shootZones })
      })
    },
    onWorkersValid (value) {
      this.workersValid = value
    }
  }
}
</script>
