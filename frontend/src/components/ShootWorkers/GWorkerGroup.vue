<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="internalValue"
    :toolbar-title="workerGroup.name"
    placement="bottom"
  >
    <template #activator="{ props }">
      <v-chip
        v-bind="props"
        size="small"
        class="cursor-pointer"
        variant="tonal"
        :color="chipColor"
      >
        <g-vendor-icon
          :icon="machineImage?.icon"
          :size="20"
        />
        <span
          v-tooltip:top="{
            text: 'Machine image version is deprecated',
            disabled: !machineImage?.isDeprecated
          }"
          class="pl-1"
        >{{ workerGroup.name }}</span>
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
        OVERVIEW
      </v-tab>
      <v-tab
        value="yaml"
        class="text-caption text-medium-emphasis"
      >
        YAML
      </v-tab>
    </v-tabs>
    <v-card-text>
      <v-window
        v-model="tab"
        class="group-window"
      >
        <v-window-item value="overview">
          <v-container class="pa-0">
            <v-row dense>
              <v-col cols="6">
                <v-card
                  class="border"
                >
                  <v-toolbar
                    height="28"
                    class="text-medium-emphasis"
                  >
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
                        <legend class="text-caption text-medium-emphasis">
                          Architecture
                        </legend>
                        <span class="text-body-2">{{ workerGroup.machine.architecture }}</span>
                      </v-col>
                      <v-col>
                        <legend class="text-caption text-medium-emphasis">
                          Type
                        </legend>
                        <span class="text-body-2">{{ workerGroup.machine.type }}</span>
                      </v-col>
                      <v-col
                        v-if="workerGroup.zones && workerGroup.zones.length"
                        cols="12"
                      >
                        <legend class="text-caption text-medium-emphasis">
                          Zones
                        </legend>
                        <v-chip
                          v-for="zone in workerGroup.zones"
                          :key="zone"
                          size="small"
                          label
                          variant="tonal"
                          class="ma-1"
                        >
                          {{ zone }}
                        </v-chip>
                      </v-col>
                      <template v-if="machineType">
                        <v-col>
                          <legend class="text-caption text-medium-emphasis">
                            CPUs
                          </legend>
                          <span class="text-body-2">{{ machineType.cpu }}</span>
                        </v-col>
                        <v-col>
                          <legend class="text-caption text-medium-emphasis">
                            GPUs
                          </legend>
                          <span class="text-body-2">{{ machineType.gpu }}</span>
                        </v-col>
                        <v-col>
                          <legend class="text-caption text-medium-emphasis">
                            Memory
                          </legend>
                          <span class="text-body-2">{{ machineType.memory }}</span>
                        </v-col>
                      </template>
                    </v-row>
                  </v-card-text>
                </v-card>
                <v-card
                  class="border mt-2"
                >
                  <v-toolbar
                    height="28"
                    class="text-medium-emphasis"
                  >
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
                        <legend class="text-caption text-medium-emphasis">
                          Type
                        </legend>
                        <span class="text-body-2">{{ volumeCardData.type }}</span>
                      </v-col>
                      <v-col v-if="volumeCardData.class">
                        <legend class="text-caption text-medium-emphasis">
                          Class
                        </legend>
                        <span class="text-body-2">{{ volumeCardData.class }}</span>
                      </v-col>
                      <v-col v-if="volumeCardData.size">
                        <legend class="text-caption text-medium-emphasis">
                          Size
                        </legend>
                        <span class="text-body-2">{{ volumeCardData.size }}</span>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card
                  class="border"
                >
                  <v-toolbar
                    height="28"
                    class="text-medium-emphasis"
                  >
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
                        <legend class="text-caption text-medium-emphasis">
                          Name
                        </legend>
                        <span class="text-body-2">{{ machineImage ? machineImage.displayName : workerGroup.machine.image.name }}</span>
                      </v-col>
                      <v-col>
                        <legend class="text-caption text-medium-emphasis">
                          Version
                        </legend>
                        <span class="text-body-2">{{ workerGroup.machine.image.version }}</span>
                      </v-col>
                      <template v-if="machineImage">
                        <v-col
                          cols="12"
                        >
                          <legend class="text-caption text-medium-emphasis">
                            Classification
                          </legend>
                          <v-icon
                            size="x-small"
                            :color="classificationColor"
                            :icon="classificationIcon"
                          />
                          {{ machineImage.classification }}
                        </v-col>
                        <v-col
                          v-if="machineImage.expirationDate"
                          cols="12"
                        >
                          <v-icon
                            v-if="machineImage.isExpirationWarning"
                            size="x-small"
                            class="mr-1"
                            color="warning"
                          >
                            mdi-alert
                          </v-icon>
                          Image expires
                          <g-time-string
                            :date-time="machineImage.expirationDate"
                            mode="future"
                            date-tooltip
                          />
                        </v-col>
                      </template>
                      <v-col
                        v-else
                        cols="12"
                      >
                        <v-icon
                          size="small"
                          class="mr-1"
                          color="warning"
                        >
                          mdi-alert
                        </v-icon>Image not found in cloud profile
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
                <v-card
                  class="border mt-2"
                >
                  <v-toolbar
                    height="28"
                    class="text-medium-emphasis"
                  >
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
                        <legend class="text-caption text-medium-emphasis">
                          Maximum
                        </legend>
                        <span class="text-body-2">{{ workerGroup.maximum }}</span>
                      </v-col>
                      <v-col cols="6">
                        <legend class="text-caption text-medium-emphasis">
                          Minimum
                        </legend>
                        <span class="text-body-2">{{ workerGroup.minimum }}</span>
                      </v-col>
                      <v-col cols="6">
                        <legend class="text-caption text-medium-emphasis">
                          Max. Surge
                        </legend>
                        <span class="text-body-2">{{ workerGroup.maxSurge }}</span>
                      </v-col>
                      <v-col cols="6">
                        <legend class="text-caption text-medium-emphasis">
                          Max. Unavailable
                        </legend>
                        <span class="text-body-2">{{ workerGroup.maxUnavailable }}</span>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
                <v-card
                  class="border mt-2"
                >
                  <v-toolbar
                    height="28"
                    class="text-medium-emphasis"
                  >
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
                        <legend class="text-caption text-medium-emphasis">
                          Name
                        </legend>
                        <span class="text-body-2">{{ machineCri.name }}</span>
                      </v-col>
                      <v-col
                        v-if="machineCri.containerRuntimes && machineCri.containerRuntimes.length"
                        cols="12"
                      >
                        <legend class="text-caption text-medium-emphasis">
                          Additional OCI Runtimes
                        </legend>
                        <v-chip
                          v-for="containerRuntime in machineCri.containerRuntimes"
                          :key="containerRuntime.type"
                          size="small"
                          label
                          variant="tonal"
                          class="px-1 mr-1"
                        >
                          {{ containerRuntime.type }}
                        </v-chip>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-container>
        </v-window-item>
        <v-window-item value="yaml">
          <g-code-block
            lang="yaml"
            :content="workerGroupYaml"
            max-height="100%"
          />
        </v-window-item>
      </v-window>
    </v-card-text>
  </g-popover>
</template>

<script>
import { ref } from 'vue'
import { mapActions } from 'pinia'
import yaml from 'js-yaml'

import { useCloudProfileStore } from '@/store/cloudProfile'

import GCodeBlock from '@/components/GCodeBlock'
import GVendorIcon from '@/components/GVendorIcon'

import { useShootItem } from '@/composables/useShootItem'

import get from 'lodash/get'
import find from 'lodash/find'

export default {
  components: {
    GCodeBlock,
    GVendorIcon,
  },
  inject: [
    'mergeProps',
    'activePopoverKey',
  ],
  props: {
    workerGroup: {
      type: Object,
    },
  },
  setup () {
    const {
      shootMetadata,
      shootCloudProfileRef,
    } = useShootItem()

    const tab = ref('overview')

    return {
      tab,
      shootMetadata,
      shootCloudProfileRef,
    }
  },
  data () {
    return {
      workerGroupYaml: undefined,
    }
  },
  computed: {
    popoverKey () {
      return `g-worker-group[${this.workerGroup.name}]:${this.shootMetadata.uid}`
    },
    internalValue: {
      get () {
        return this.activePopoverKey === this.popoverKey
      },
      set (value) {
        this.activePopoverKey = value ? this.popoverKey : ''
      },
    },
    machineType () {
      const machineTypes = this.machineTypesByCloudProfileRef(this.shootCloudProfileRef)
      const type = get(this.workerGroup, ['machine', 'type'])
      return find(machineTypes, ['name', type])
    },
    volumeType () {
      const volumeTypes = this.volumeTypesByCloudProfileRef(this.shootCloudProfileRef)
      const type = get(this.workerGroup, ['volume', 'type'])
      return find(volumeTypes, ['name', type])
    },
    volumeCardData () {
      const storage = get(this.machineType, ['storage'], {})
      const volume = get(this.workerGroup, ['volume'], {})

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
      const machineImages = this.machineImagesByCloudProfileRef(this.shootCloudProfileRef)
      const { name, version } = get(this.workerGroup, ['machine', 'image'], {})
      return find(machineImages, { name, version })
    },
    machineCri () {
      return this.workerGroup.cri ?? {}
    },
    classificationColor () {
      if (this.machineImage.isDeprecated) {
        return 'warning'
      }
      if (this.machineImage.isPreview) {
        return 'info'
      }
      return 'primary'
    },
    classificationIcon () {
      if (this.machineImage.isDeprecated || this.machineImage.isPreview) {
        return 'mdi-alert-circle-outline'
      }
      return 'mdi-information-outline'
    },
    chipColor () {
      return !this.machineImage || this.machineImage.isDeprecated ? 'warning' : 'primary'
    },
  },
  created () {
    this.updateWorkerGroupYaml(this.workerGroup)
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'machineTypesByCloudProfileRef',
      'volumeTypesByCloudProfileRef',
      'machineImagesByCloudProfileRef',
    ]),
    updateWorkerGroupYaml (value) {
      this.workerGroupYaml = yaml.dump(value)
    },
  },
}
</script>

<style>
  .border {
    border-color: rgba(var(--v-border-color), var(--v-border-opacity)) !important;
  }

  .group-window {
    width: 450px;
  }
</style>
