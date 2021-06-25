<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    :valid="workersValid"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    max-width="760"
    confirmRequired
    confirm-message="Please confirm changes to the worker groups as this may affect your workload"
    caption="Configure Workers"
    disable-confirm-input-focus>
    <template v-slot:actionComponent>
      <manage-workers
        @valid="onWorkersValid"
        ref="manageWorkers"
        v-on="$manageWorkers.hooks"
      ></manage-workers>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import { patchShootProvider } from '@/utils/api'
import shootItem from '@/mixins/shootItem'
import asyncRef from '@/mixins/asyncRef'
import { errorDetailsFromError } from '@/utils/error'
import { isZonedCluster } from '@/utils'
import get from 'lodash/get'
import cloneDeep from 'lodash/cloneDeep'
const ManageWorkers = () => import('@/components/ShootWorkers/ManageWorkers')

export default {
  name: 'worker-configuration',
  components: {
    ActionButtonDialog,
    ManageWorkers
  },
  data () {
    return {
      workersValid: false,
      workers: undefined
    }
  },
  mixins: [
    shootItem,
    asyncRef('manageWorkers')
  ],
  methods: {
    async onConfigurationDialogOpened () {
      await this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        await this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        const vm = await this.$manageWorkers.vm()
        const workers = vm.getWorkers()
        const zonesNetworkConfiguration = vm.currentZonesNetworkConfiguration
        const data = { workers }
        if (zonesNetworkConfiguration) {
          data.infrastructureConfig = {
            networks: {
              zones: zonesNetworkConfiguration
            }
          }
        }
        await patchShootProvider({ namespace: this.shootNamespace, name: this.shootName, data })
      } catch (err) {
        const errorMessage = 'Could not save worker configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    async reset () {
      this.workersValid = false

      const workers = cloneDeep(this.shootWorkerGroups)
      const zonesNetworkConfiguration = get(this.shootItem, 'spec.provider.infrastructureConfig.networks.zones')
      const cloudProfileName = this.shootCloudProfileName
      const region = this.shootRegion
      const zonedCluster = isZonedCluster({ cloudProviderKind: this.shootCloudProviderKind, shootSpec: this.shootSpec })
      const existingWorkerCIDR = get(this.shootItem, 'spec.networking.nodes')

      await this.$manageWorkers.dispatch('setWorkersData', { workers, cloudProfileName, region, zonesNetworkConfiguration, zonedCluster, existingWorkerCIDR, kubernetesVersion: this.shootK8sVersion })
    },
    onWorkersValid (value) {
      this.workersValid = value
    }
  }
}
</script>
