<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :key="componentKey"
    :shoot-item="shootItem"
    :valid="workersValid"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    width="1250"
    confirm-required
    caption="Configure Workers"
    disable-confirm-input-focus
    max-height="80vh">
    <template #top>
      <v-tabs
        color="primary"
        v-model="tab"
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
    <template #card>
      <v-window v-model="tab">
        <v-window-item value="overview" ref="overviewTab">
          <g-manage-workers
            @valid="onWorkersValid"
            @additionalZonesNetworkConfiguration="setNetworkConfiguration"
            ref="manageWorkersRef"
          ></g-manage-workers>
        </v-window-item>
        <v-window-item value="yaml">
          <g-shoot-editor
            :shoot-item="editorData"
            :completionPaths="['spec.properties.provider.properties.workers', 'spec.properties.provider.properties.infrastructureConfig']"
            ref="workerEditorRef"
            hide-toolbar
            :style="{ 'min-height': `${overviewTabHeight}px` }"
          >
          </g-shoot-editor>
        </v-window-item>
      </v-window>
    </template>
    <template #errorMessage>
      <v-expand-transition appear>
        <v-alert
          type="warning"
          outlined
          tile
          prominent
          v-if="networkConfiguration.length"
          dismissible
          @input="setNetworkConfiguration(undefined)"
          class="mx-1">
          <span>Adding addtional zones will extend the zone network configuration by adding new networks to your cluster:</span>
          <g-code-block
            lang="yaml"
            :content="networkConfigurationYaml"
            :show-copy-button="false"
            ></g-code-block>
          <div class="font-weight-bold">This change cannot be undone.</div>
          <div>You can verify and modify the network configuration on the <a href="#" @click="tab='yaml'">yaml</a> tab.</div>
        </v-alert>
      </v-expand-transition>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { defineComponent, defineAsyncComponent } from 'vue'
import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GCodeBlock from '@/components/GCodeBlock'
import shootItem from '@/mixins/shootItem'
import { useAsyncRef } from '@/composables'
import { errorDetailsFromError } from '@/utils/error'
import { isZonedCluster } from '@/utils'
import get from 'lodash/get'
import cloneDeep from 'lodash/cloneDeep'
import { v4 as uuidv4 } from '@/utils/uuid'

export default defineComponent({
  setup () {
    return {
      ...useAsyncRef('manageWorkers'),
      ...useAsyncRef('workerEditor'),
    }
  },
  components: {
    GActionButtonDialog,
    GManageWorkers: defineAsyncComponent(() => import('@/components/ShootWorkers/GManageWorkers')),
    GShootEditor: defineAsyncComponent(() => import('@/components/GShootEditor')),
    GCodeBlock,
  },
  inject: ['api', 'yaml'],
  data () {
    return {
      workersValid: false,
      workers: undefined,
      networkConfiguration: [],
      networkConfigurationYaml: undefined,
      tabValue: 'overview',
      editorData: {},
      overviewTabHeight: 0,
      componentKey: uuidv4(),
    }
  },
  mixins: [
    shootItem,
  ],
  computed: {
    tab: {
      get () {
        return this.tabValue
      },
      set (value) {
        this.tabValue = value
        if (value === 'overview') {
          this.setOverviewData()
        }
        if (value === 'yaml') {
          // set current height as min-height for yaml tab to avoid
          // dialog downsize as editor not yet rendered
          this.overviewTabHeight = this.$refs.overviewTab.$el.getBoundingClientRect().height
          this.setEditorData()
        }
      },
    },
  },
  methods: {
    async onConfigurationDialogOpened () {
      await this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        await this.updateConfiguration()
      }
      this.tabValue = 'overview'
      this.componentKey = uuidv4() // force re-render
    },
    async updateConfiguration () {
      try {
        let data
        if (this.tab === 'overview') {
          data = await this.getWorkerComponentData()
        } else if (this.tab === 'yaml') {
          data = await this.getWorkerEditorData()
        }
        await this.patchShootProvider({ namespace: this.shootNamespace, name: this.shootName, data })
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

      await this.manageWorkers.dispatch('setWorkersData', { workers, cloudProfileName, region, zonesNetworkConfiguration, zonedCluster, existingWorkerCIDR, kubernetesVersion: this.shootK8sVersion })
    },
    onWorkersValid (value) {
      this.workersValid = value
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
})
</script>
