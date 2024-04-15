<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :key="componentKey"
    ref="actionDialog"
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
          class="ma-3"
        >
          <g-manage-workers
            :disable-worker-animation="disableWorkerAnimation"
          />
        </v-window-item>
        <v-window-item value="yaml">
          <div :style="{ 'min-height': `${overviewTabHeight}px` }">
            <g-shoot-editor
              :identifier="injectionKey"
              hide-toolbar
              animate-on-appear
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
          v-if="newZonesYaml"
          v-model="newZonesAlert"
          type="warning"
          variant="tonal"
          tile
          prominent
          closable
        >
          <span>Adding addtional zones will extend the zone network configuration by adding new networks to your cluster:</span>
          <g-code-block
            lang="yaml"
            :content="newZonesYaml"
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
import {
  ref,
  computed,
  provide,
  defineAsyncComponent,
} from 'vue'
import { storeToRefs } from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import yaml from 'js-yaml'

import { useShootContextStore } from '@/store/shootContext'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GCodeBlock from '@/components/GCodeBlock'

import { useShootItem } from '@/composables/useShootItem'
import { useShootEditor } from '@/composables/useShootEditor'

import { errorDetailsFromError } from '@/utils/error'
import { v4 as uuidv4 } from '@/utils/uuid'

import {
  get,
  set,
  filter,
  includes,
  isEmpty,
} from '@/lodash'

export default {
  components: {
    GActionButtonDialog,
    GManageWorkers: defineAsyncComponent(() => import('@/components/ShootWorkers/GManageWorkers')),
    GShootEditor: defineAsyncComponent(() => import('@/components/GShootEditor')),
    GCodeBlock,
  },
  inject: ['api', 'logger'],
  setup () {
    const {
      shootItem,
      hasShootWorkerGroups,
    } = useShootItem()

    const shootContextStore = useShootContextStore()
    const {
      providerWorkers,
      providerInfrastructureConfigNetworksZones,
      initialZones,
    } = storeToRefs(shootContextStore)
    const {
      setShootManifest,
    } = shootContextStore

    const tab = ref('overview')
    const overviewTabHeight = ref(0)
    const componentKey = ref(uuidv4())
    const disableWorkerAnimation = ref(false)
    const newZonesAlert = ref(true)

    const newZones = computed(() => {
      const predicate = ({ name }) => !includes(initialZones.value, name)
      return filter(providerInfrastructureConfigNetworksZones.value, predicate)
    })

    const newZonesYaml = computed(() => {
      return isEmpty(newZones.value)
        ? undefined
        : yaml.dump(newZones.value)
    })

    function getProviderData (source) {
      let workers, zones
      switch (source) {
        case 'overview': {
          workers = providerWorkers.value
          zones = providerInfrastructureConfigNetworksZones.value
          break
        }
        case 'yaml': {
          const value = getEditorValue()
          workers = get(value, 'spec.provider.workers')
          zones = get(value, 'spec.provider.infrastructureConfig.networks.zones', [])
          break
        }
      }
      const data = {}
      set(data, 'workers', workers)
      set(data, 'infrastructureConfig.networks.zones', zones)
      return data
    }

    const overviewData = computed(() => {
      return {
        spec: {
          provider: getProviderData('overview'),
        },
      }
    })

    const useProvide = (key, value) => {
      provide(key, value)
      return value
    }
    const injectionKey = 'shoot-worker-editor'
    const {
      getEditorValue,
      refreshEditor,
    } = useProvide(injectionKey, useShootEditor(overviewData, {
      completionPaths: [
        'spec.properties.provider.properties.workers',
        'spec.properties.provider.properties.infrastructureConfig',
      ],
    }))

    return {
      v$: useVuelidate(),
      shootItem,
      hasShootWorkerGroups,
      providerWorkers,
      providerInfrastructureConfigNetworksZones,
      setShootManifest,
      injectionKey,
      tab,
      overviewTabHeight,
      componentKey,
      disableWorkerAnimation,
      newZonesAlert,
      newZonesYaml,
      getProviderData,
      refreshEditor,
    }
  },
  watch: {
    tab (value) {
      switch (value) {
        case 'overview': {
          setTimeout(() => {
            // enable worker group animations after tab navigation animation completed
            this.disableWorkerAnimation = false
          }, 1500)
          this.providerWorkers = this.getProviderData('yaml').workers
          break
        }
        case 'yaml': {
          // set current height as min-height for yaml tab to avoid
          // dialog downsize as editor not yet rendered
          this.overviewTabHeight = this.$refs.overviewTab.$el.getBoundingClientRect().height
          this.disableWorkerAnimation = true
          this.refreshEditor()
          break
        }
      }
    },
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.setShootManifest(this.shootItem)
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        if (await this.updateConfiguration()) {
          this.tab = 'overview'
          this.componentKey = uuidv4() // force re-render
        }
      } else {
        this.tab = 'overview'
        this.componentKey = uuidv4() // force re-render
      }
    },
    async updateConfiguration () {
      try {
        await this.api.patchShootProvider({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: this.getProviderData(this.tab),
        })
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
  },
}
</script>
