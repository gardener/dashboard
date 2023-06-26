<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

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
        small
        class="cursor-pointer my-0 ml-0"
        outlined
        color="primary">
          <g-vendor-icon :icon="machineImageIcon" :size="20"></g-vendor-icon>
          {{workerGroup.name}}
      </v-chip>
    </template>
    <template #text>
      <v-tabs
        height="32"
        color="primary"
        v-model="tab"
      >
        <v-tab
          key="overview"
          href="#overview"
          class="text-caption"
        >
          Overview
        </v-tab>
        <v-tab
          key="yaml"
          href="#yaml"
          class="text-caption"
        >
          Yaml
        </v-tab>
      </v-tabs>
      <v-tabs-items v-model="tab">
        <v-tab-item id="overview">
          <v-container class="pa-2">
            <v-row dense>
              <v-col cols="6">
                <v-card outlined>
                  <v-system-bar>
                    <v-icon class="mr-2">mdi-server</v-icon>Machine
                  </v-system-bar>
                  <v-card-text>
                    <v-row dense>
                      <v-col v-if="workerGroup.machine.architecture">
                        <legend class="text-caption">Architecture</legend>
                        <span class="text--primary">{{workerGroup.machine.architecture}}</span>
                      </v-col>
                      <v-col>
                        <legend class="text-caption">Type</legend>
                        <span class="text--primary">{{workerGroup.machine.type}}</span>
                      </v-col>
                      <v-col cols="12" v-if="workerGroup.zones && workerGroup.zones.length">
                        <legend class="text-caption">Zones</legend>
                        <v-chip small label outlined class="px-1 mr-1" v-for="zone in workerGroup.zones" :key="zone">{{zone}}</v-chip>
                      </v-col>
                      <template v-if="machineType">
                        <v-col>
                          <legend class="text-caption">CPUs</legend>
                          <span class="text--primary">{{machineType.cpu}}</span>
                        </v-col>
                        <v-col>
                          <legend class="text-caption">GPUs</legend>
                          <span class="text--primary">{{machineType.gpu}}</span>
                        </v-col>
                        <v-col>
                          <legend class="text-caption">Memory</legend>
                          <span class="text--primary">{{machineType.memory}}</span>
                        </v-col>
                      </template>
                    </v-row>
                  </v-card-text>
                </v-card>
                <v-card outlined class="mt-2">
                  <v-system-bar>
                    <v-icon class="mr-2">mdi-harddisk</v-icon>Volume
                  </v-system-bar>
                  <v-card-text>
                    <v-row>
                      <v-col v-if="volumeCardData.type">
                        <legend class="text-caption">Type</legend>
                        <span class="text--primary">{{volumeCardData.type}}</span>
                      </v-col>
                      <v-col v-if="volumeCardData.class">
                        <legend class="text-caption">Class</legend>
                        <span class="text--primary">{{volumeCardData.class}}</span>
                      </v-col>
                      <v-col v-if="volumeCardData.size">
                        <legend class="text-caption">Size</legend>
                        <span class="text--primary">{{volumeCardData.size}}</span>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card outlined>
                  <v-system-bar>
                    <v-icon class="mr-2">mdi-disc</v-icon>Image
                  </v-system-bar>
                  <v-card-text>
                    <v-row dense>
                      <v-col>
                        <legend class="text-caption">Name</legend>
                        <span class="text--primary">{{workerGroup.machine.image.name}}</span>
                      </v-col>
                      <v-col>
                        <legend class="text-caption">Version</legend>
                        <span class="text--primary">{{workerGroup.machine.image.version}}</span>
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
                  <v-system-bar>
                    <v-icon class="mr-2">mdi-chart-line-variant</v-icon>Autoscaler
                  </v-system-bar>
                  <v-card-text>
                    <v-row dense>
                      <v-col cols="6">
                        <legend class="text-caption">Maximum</legend>
                        <span class="text--primary">{{workerGroup.maximum}}</span>
                      </v-col>
                      <v-col cols="6">
                        <legend class="text-caption">Minimum</legend>
                        <span class="text--primary">{{workerGroup.minimum}}</span>
                      </v-col>
                      <v-col cols="6">
                        <legend class="text-caption">Max. Surge</legend>
                        <span class="text--primary">{{workerGroup.maxSurge}}</span>
                      </v-col>
                      <v-col cols="6">
                        <legend class="text-caption">Max. Unavailable</legend>
                        <span class="text--primary">{{workerGroup.maxUnavailable}}</span>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
                <v-card outlined class="mt-2">
                  <v-system-bar>
                    <v-icon class="mr-2">mdi-oci</v-icon>Container Runtime
                  </v-system-bar>
                  <v-card-text>
                    <v-row dense>
                      <v-col>
                        <legend class="text-caption">Name</legend>
                        <span class="text--primary">{{machineCri.name}}</span>
                      </v-col>
                      <v-col cols="12" v-if="machineCri.containerRuntimes && machineCri.containerRuntimes.length">
                        <legend class="text-caption">Additional OCI Runtimes</legend>
                        <v-chip small label outlined class="px-1 mr-1" v-for="containerRuntime in machineCri.containerRuntimes" :key="containerRuntime.type">{{containerRuntime.type}}</v-chip>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-container>
        </v-tab-item>
        <v-tab-item id="yaml">
          <g-code-block lang="yaml" :content="workerGroupYaml"></g-code-block>
        </v-tab-item>
      </v-tabs-items>
    </template>
  </g-popover>
</template>

<script>
import { defineComponent } from 'vue'
import GPopover from '@/components/GPopover'
import GVendorIcon from '@/components/GVendorIcon'
import GCodeBlock from '@/components/GCodeBlock'
import find from 'lodash/find'
import get from 'lodash/get'
import { mapActions } from 'pinia'
import { useCloudProfileStore } from '@/store/cloudProfile'

export default defineComponent({
  name: 'worker-group',
  components: {
    GPopover,
    GVendorIcon,
    GCodeBlock,
  },
  props: {
    workerGroup: {
      type: Object,
    },
    cloudProfileName: {
      type: String,
    },
    modelValue: {
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
})
</script>

<style lang="scss" scoped>
  ::v-deep .popper {
    text-align: initial;
    width: 600px;
  }
</style>
