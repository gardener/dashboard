<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    :toolbar-title="workerGroup.name"
    placement="bottom"
  >
    <template #activator="{ props }">
      <v-chip
        v-bind="props"
        size="small"
        class="cursor-pointer my-0 ml-0"
        variant="outlined"
        color="primary"
      >
        <g-vendor-icon
          :icon="machineImageIcon"
          :size="20"
        />
        {{workerGroup.name}}
      </v-chip>
    </template>
    <v-tabs
      v-model="tab"
      height="32"
      color="primary"
    >
      <v-tab
        value="overview"
        class="text-caption text-medium-emphasis"
      >
        Overview
      </v-tab>
      <v-tab
        value="yaml"
        class="text-caption text-medium-emphasis"
      >
        Yaml
      </v-tab>
    </v-tabs>
    <v-card-text>
      <v-window
        v-model="tab"
        min-width="600"
      >
        <v-window-item value="overview">
          <v-container class="pa-2">
            <v-row dense>
              <v-col cols="6">
                <v-card outlined>
                  <v-toolbar height="28" class="text-medium-emphasis">
                    <template #prepend>
                      <v-icon
                        icon="mdi-server"
                        size="x-small"
                      />
                    </template>
                    <template #title>
                      <span class="text-body-2">
                        Machine
                      </span>
                    </template>
                  </v-toolbar>
                  <v-card-text>
                    <v-row dense>
                      <v-col v-if="workerGroup.machine.architecture">
                        <legend class="text-caption text-medium-emphasis">Architecture</legend>
                        <span class="text-body-2">{{workerGroup.machine.architecture}}</span>
                      </v-col>
                      <v-col>
                        <legend class="text-caption text-medium-emphasis">Type</legend>
                        <span class="text-body-2">{{workerGroup.machine.type}}</span>
                      </v-col>
                      <v-col cols="12" v-if="workerGroup.zones && workerGroup.zones.length">
                        <legend class="text-caption text-medium-emphasis">Zones</legend>
                        <v-chip small label outlined class="px-1 mr-1" v-for="zone in workerGroup.zones" :key="zone">{{zone}}</v-chip>
                      </v-col>
                      <template v-if="machineType">
                        <v-col>
                          <legend class="text-caption text-medium-emphasis">CPUs</legend>
                          <span class="text-body-2">{{machineType.cpu}}</span>
                        </v-col>
                        <v-col>
                          <legend class="text-caption text-medium-emphasis">GPUs</legend>
                          <span class="text-body-2">{{machineType.gpu}}</span>
                        </v-col>
                        <v-col>
                          <legend class="text-caption text-medium-emphasis">Memory</legend>
                          <span class="text-body-2">{{machineType.memory}}</span>
                        </v-col>
                      </template>
                    </v-row>
                  </v-card-text>
                </v-card>
                <v-card outlined class="mt-2">
                  <v-toolbar height="28" class="text-medium-emphasis">
                    <template #prepend>
                      <v-icon
                        icon="mdi-harddisk"
                        size="x-small"
                      />
                    </template>
                    <template #title>
                      <span class="text-body-2">
                        Volume
                      </span>
                    </template>
                  </v-toolbar>
                  <v-card-text>
                    <v-row>
                      <v-col v-if="volumeCardData.type">
                        <legend class="text-caption text-medium-emphasis">Type</legend>
                        <span class="text-body-2">{{volumeCardData.type}}</span>
                      </v-col>
                      <v-col v-if="volumeCardData.class">
                        <legend class="text-caption text-medium-emphasis">Class</legend>
                        <span class="text-body-2">{{volumeCardData.class}}</span>
                      </v-col>
                      <v-col v-if="volumeCardData.size">
                        <legend class="text-caption text-medium-emphasis">Size</legend>
                        <span class="text-body-2">{{volumeCardData.size}}</span>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card outlined>
                  <v-toolbar height="28" class="text-medium-emphasis">
                    <template #prepend>
                      <v-icon
                        icon="mdi-disc"
                        size="x-small"
                      />
                    </template>
                    <template #title>
                      <span class="text-body-2">
                        Image
                      </span>
                    </template>
                  </v-toolbar>
                  <v-card-text>
                    <v-row dense>
                      <v-col>
                        <legend class="text-caption text-medium-emphasis">Name</legend>
                        <span class="text-body-2">{{workerGroup.machine.image.name}}</span>
                      </v-col>
                      <v-col>
                        <legend class="text-caption text-medium-emphasis">Version</legend>
                        <span class="text-body-2">{{workerGroup.machine.image.version}}</span>
                      </v-col>
                      <v-col cols="12" v-if="!machineImage">
                        <v-icon small class="mr-1" color="warning">mdi-alert</v-icon>Image not found in cloud profile
                      </v-col>
                      <v-col cols="12" v-else-if="machineImage.expirationDate">
                        <v-icon small class="mr-1" color="warning">mdi-alert</v-icon>Image expires on {{machineImage.expirationDateString}}
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
                <v-card outlined class="mt-2">
                  <v-toolbar height="28" class="text-medium-emphasis">
                    <template #prepend>
                      <v-icon
                        icon="mdi-chart-line-variant"
                        size="x-small"
                      />
                    </template>
                    <template #title>
                      <span class="text-body-2">
                        Autoscaler
                      </span>
                    </template>
                  </v-toolbar>
                  <v-card-text>
                    <v-row dense>
                      <v-col cols="6">
                        <legend class="text-caption text-medium-emphasis">Maximum</legend>
                        <span class="text-body-2">{{workerGroup.maximum}}</span>
                      </v-col>
                      <v-col cols="6">
                        <legend class="text-caption text-medium-emphasis">Minimum</legend>
                        <span class="text-body-2">{{workerGroup.minimum}}</span>
                      </v-col>
                      <v-col cols="6">
                        <legend class="text-caption text-medium-emphasis">Max. Surge</legend>
                        <span class="text-body-2">{{workerGroup.maxSurge}}</span>
                      </v-col>
                      <v-col cols="6">
                        <legend class="text-caption text-medium-emphasis">Max. Unavailable</legend>
                        <span class="text-body-2">{{workerGroup.maxUnavailable}}</span>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
                <v-card outlined class="mt-2">
                  <v-toolbar height="28" class="text-medium-emphasis">
                    <template #prepend>
                      <v-icon
                        icon="mdi-oci"
                        size="x-small"
                      />
                    </template>
                    <template #title>
                      <span class="text-body-2">
                        Container Runtime
                      </span>
                    </template>
                  </v-toolbar>
                  <v-card-text>
                    <v-row dense>
                      <v-col>
                        <legend class="text-caption text-medium-emphasis">Name</legend>
                        <span class="text-body-2">{{machineCri.name}}</span>
                      </v-col>
                      <v-col cols="12" v-if="machineCri.containerRuntimes && machineCri.containerRuntimes.length">
                        <legend class="text-caption text-medium-emphasis">Additional OCI Runtimes</legend>
                        <v-chip small label outlined class="px-1 mr-1" v-for="containerRuntime in machineCri.containerRuntimes" :key="containerRuntime.type">{{containerRuntime.type}}</v-chip>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-container>
        </v-window-item>
        <v-window-item value="yaml">
          <g-code-block lang="yaml" :content="workerGroupYaml" style="min-width: 480px"></g-code-block>
        </v-window-item>
      </v-window>
    </v-card-text>
  </g-popover>
</template>

<script>
import { mapActions } from 'pinia'
import { useCloudProfileStore } from '@/store/cloudProfile'

import GVendorIcon from '@/components/GVendorIcon'
import GCodeBlock from '@/components/GCodeBlock'

import find from 'lodash/find'
import get from 'lodash/get'

export default {
  name: 'GWorkerGroup',
  components: {
    GVendorIcon,
    GCodeBlock,
  },
  props: {
    modelValue: {
      type: [String, Number],
    },
    workerGroup: {
      type: Object,
    },
    cloudProfileName: {
      type: String,
    },
  },
  emits: [
    'update:modelValue',
  ],
  inject: ['yaml'],
  data () {
    return {
      workerGroupYaml: undefined,
    }
  },
  computed: {
    machineType () {
      const machineTypes = this.machineTypesByCloudProfileName({ cloudProfileName: this.cloudProfileName })
      const type = get(this.workerGroup, 'machine.type')
      return find(machineTypes, ['name', type])
    },
    volumeType () {
      const volumeTypes = this.volumeTypesByCloudProfileName({ cloudProfileName: this.cloudProfileName })
      const type = get(this.workerGroup, 'volume.type')
      return find(volumeTypes, ['name', type])
    },
    volumeCardData () {
      const storage = get(this.machineType, 'storage', {})
      const volume = get(this.workerGroup, 'volume', {})

      // all infrastructures support volume sizes, but for some they are optional
      // if no size is defined on the worker itself, check if machine storage defines a default size
      const volumeSize = volume.size || storage.size

      // workers with volume type (e.g. aws)
      if (volume.type) {
        return {
          type: volume.type,
          class: this.volumeType?.class,
          size: volumeSize,
        }
      }

      // workers with storage in machine type metadata (e.g. openstack)
      if (storage.type) {
        return {
          type: storage.type,
          class: storage.class,
          size: volumeSize,
        }
      }
      return {}
    },
    machineImage () {
      const machineImages = this.machineImagesByCloudProfileName(this.cloudProfileName)
      const { name, version } = get(this.workerGroup, 'machine.image', {})
      return find(machineImages, { name, version })
    },
    machineCri () {
      return this.workerGroup.cri ?? {}
    },
    machineImageIcon () {
      return get(this.machineImage, 'icon')
    },
    tab: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'machineTypesByCloudProfileName',
      'volumeTypesByCloudProfileName',
      'machineImagesByCloudProfileName',
    ]),
    async updateWorkerGroupYaml (value) {
      this.workerGroupYaml = await this.yaml.dump(value)
    },
  },
  created () {
    this.updateWorkerGroupYaml(this.workerGroup)
  },
}
</script>
