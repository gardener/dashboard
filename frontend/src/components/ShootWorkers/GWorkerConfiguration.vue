<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :key="componentKey"
    ref="actionDialog"
    :shoot-item="shootItem"
    width="1250"
    confirm-required
    caption="Configure Workers"
    disable-confirm-input-focus
    max-height="80vh"
    :disabled="!hasShootWorkerGroups"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #header>
      <v-tabs
        v-model="tab"
        color="primary"
      >
        <v-tab
          key="overview"
          value="overview"
        >
          Overview
        </v-tab>
        <v-tab
          key="yaml"
          value="yaml"
        >
          Yaml
        </v-tab>
      </v-tabs>
    </template>
    <template #content>
      <v-window v-model="tab">
        <v-window-item
          ref="overviewTab"
          value="overview"
        >
          <g-manage-workers
            ref="manageWorkersRef"
            :disable-worker-animation="disableWorkerAnimation"
            @additional-zones-network-configuration="setNetworkConfiguration"
          />
        </v-window-item>
        <v-window-item value="yaml">
          <div :style="{ 'min-height': `${overviewTabHeight}px` }">
            <g-shoot-editor
              ref="workerEditorRef"
              :shoot-item="editorData"
              :completion-paths="['spec.properties.provider.properties.workers', 'spec.properties.provider.properties.infrastructureConfig']"
              hide-toolbar
              animate-on-appear
              alert-banner-identifier="workerEditorWarning"
            >
              <template #modificationWarning>
                Directly modifying this resource can result in irreversible configurations that may severely compromise your cluster's stability and functionality.
                Use worker resource editor with caution.
              </template>
            </g-shoot-editor>
          </div>
        </v-window-item>
      </v-window>
    </template>
    <template #footer>
      <v-expand-transition>
        <v-alert
          v-if="networkConfiguration.length"
          type="warning"
          variant="tonal"
          tile
          prominent
          closable
          @update:model-value="setNetworkConfiguration(undefined)"
        >
          <span>Adding addtional zones will extend the zone network configuration by adding new networks to your cluster:</span>
          <g-code-block
            lang="yaml"
            :content="networkConfigurationYaml"
            :show-copy-button="false"
          />
          <div class="font-weight-bold">
            This change cannot be undone.
          </div>
          <div>
            You can verify and modify the network configuration on the <a
              href="#"
              class="text-anchor"
              @click="tab='yaml'"
            >yaml</a> tab.
          </div>
        </v-alert>
      </v-expand-transition>
    </template>
  </g-action-button-dialog>
  <v-tooltip
    :activator="$refs.actionDialog"
    location="top"
    :disabled="hasShootWorkerGroups"
  >
    It is not possible to add worker groups to workerless clusters
  </v-tooltip>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GCodeBlock from '@/components/GCodeBlock'

import { useAsyncRef } from '@/composables/useAsyncRef'

import shootItem from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'
import { isZonedCluster } from '@/utils'
import { v4 as uuidv4 } from '@/utils/uuid'

import {
  get,
  cloneDeep,
} from '@/lodash'

export default {

  components: {
    GActionButtonDialog,
    GManageWorkers: defineAsyncComponent(() => import('@/components/ShootWorkers/GManageWorkers')),
    GShootEditor: defineAsyncComponent(() => import('@/components/GShootEditor')),
    GCodeBlock,
  },
  mixins: [
    shootItem,
  ],
  inject: ['api', 'logger', 'yaml'],
  setup () {
    return {
      ...useAsyncRef('manageWorkers'),
      ...useAsyncRef('workerEditor'),
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      workers: undefined,
      networkConfiguration: [],
      networkConfigurationYaml: undefined,
      tabValue: 'overview',
      editorData: {},
      overviewTabHeight: 0,
      componentKey: uuidv4(),
      disableWorkerAnimation: false,
    }
  },
  computed: {
    tab: {
      get () {
        return this.tabValue
      },
      set (value) {
        this.tabValue = value
        if (value === 'overview') {
          this.setOverviewData()
          setTimeout(() => {
            // enable worker group animations after tab navigation animation completed
            this.disableWorkerAnimation = false
          }, 1500)
        }
        if (value === 'yaml') {
          // set current height as min-height for yaml tab to avoid
          // dialog downsize as editor not yet rendered
          this.overviewTabHeight = this.$refs.overviewTab.$el.getBoundingClientRect().height
          this.setEditorData()
          this.disableWorkerAnimation = true
        }
      },
    },
  },
  methods: {
    async onConfigurationDialogOpened () {
      await this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        if (await this.updateConfiguration()) {
          this.tabValue = 'overview'
          this.componentKey = uuidv4() // force re-render
        }
      } else {
        this.tabValue = 'overview'
        this.componentKey = uuidv4() // force re-render
      }
    },
    async updateConfiguration () {
      try {
        let data
        if (this.tab === 'overview') {
          data = await this.getWorkerComponentData()
        } else if (this.tab === 'yaml') {
          data = await this.getWorkerEditorData()
        }
        await this.api.patchShootProvider({ namespace: this.shootNamespace, name: this.shootName, data })
        return true
      } catch (err) {
        const errorMessage = 'Could not save worker configuration'
        let detailedErrorMessage
        if (err.response) {
          const errorDetails = errorDetailsFromError(err)
          detailedErrorMessage = errorDetails.detailedMessage
        } else {
          detailedErrorMessage = err.message
        }
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, detailedErrorMessage, err)
        return false
      }
    },
    async reset () {
      const workers = cloneDeep(this.shootWorkerGroups)
      const zonesNetworkConfiguration = get(this.shootItem, 'spec.provider.infrastructureConfig.networks.zones')
      const cloudProfileName = this.shootCloudProfileName
      const region = this.shootRegion
      const zonedCluster = isZonedCluster({ cloudProviderKind: this.shootCloudProviderKind, shootSpec: this.shootSpec })
      const existingWorkerCIDR = get(this.shootItem, 'spec.networking.nodes')
      const updateOSMaintenance = get(this.shootItem, 'spec.maintenance.autoUpdate.machineImageVersion', true)

      await this.manageWorkers.dispatch('setWorkersData', { workers, cloudProfileName, region, updateOSMaintenance, zonesNetworkConfiguration, zonedCluster, existingWorkerCIDR, kubernetesVersion: this.shootK8sVersion })
    },
    async setNetworkConfiguration (value) {
      if (value) {
        this.networkConfiguration = value
        this.networkConfigurationYaml = await this.yaml.dump(value)
      } else {
        this.networkConfiguration = []
        this.networkConfigurationYaml = undefined
      }
    },
    async getWorkerComponentData () {
      const vm = await this.manageWorkers.vm()
      const workers = vm.getWorkers()
      const zonesNetworkConfiguration = vm.currentZonesNetworkConfiguration
      const data = { workers }
      if (zonesNetworkConfiguration) {
        data.infrastructureConfig = {
          networks: {
            zones: zonesNetworkConfiguration,
          },
        }
      }
      return data
    },
    async getWorkerEditorData () {
      const yaml = await this.workerEditor.dispatch('getContent')
      const content = await this.yaml.load(yaml)
      return get(content, 'spec.provider')
    },
    async setEditorData () {
      const editorData = await this.getWorkerComponentData()
      if (editorData) {
        this.editorData = {
          spec: {
            provider: {
              ...editorData,
            },
          },
        }
        this.workerEditor.dispatch('reload')
      }
    },
    async setOverviewData () {
      try {
        const editorData = await this.getWorkerEditorData()
        const workers = get(editorData, 'workers')
        const zonesNetworkConfiguration = get(editorData, 'infrastructureConfig.networks.zones', [])
        await this.manageWorkers.dispatch('updateWorkersData', { workers, zonesNetworkConfiguration })
      } catch (err) {
        const errorMessage = 'Could not update workers with changed yaml'
        const detailedErrorMessage = err.message
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
      }
    },
  },
}
</script>
