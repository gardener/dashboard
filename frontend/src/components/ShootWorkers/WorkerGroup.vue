<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    :title="workerGroup.name"
    :popper-key="`worker_group_${workerGroup.name}`"
    disable-content-inset
  >
    <template v-slot:popperRef>
      <v-chip
        small
        class="cursor-pointer my-0 ml-0"
        outlined
        color="primary">
          <vendor-icon :value="machineImageIcon" :size="20"></vendor-icon>
          {{workerGroup.name}}
      </v-chip>
    </template>
    <v-tabs
      color="primary"
      v-model="tab"
      class="mb-0">
      <v-tab
        key="overview"
        href="#overview"
      >
        Overview
      </v-tab>
      <v-tab
        key="yaml"
        href="#yaml"
      >
        Yaml
      </v-tab>
    </v-tabs>
    <v-tabs-items v-model="tab">
      <v-tab-item id="overview">
        <v-row class="d-flex ma-0">
          <v-col cols="6" class="pa-0">
            <v-card outlined class="d-flex flex-column flex-grow-1 mx-1 my-2">
              <v-system-bar>
                <v-icon class="mr-3">mdi-server</v-icon>
                <span>Machine</span>
              </v-system-bar>
              <v-card-text class="pa-2 d-flex">
                <v-list class="pa-0 flex-grow-1">
                  <v-list-item class="px-0" v-if="workerGroup.machine.architecture">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Architecture</v-list-item-subtitle>
                      <v-list-item-title>{{workerGroup.machine.architecture}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Type</v-list-item-subtitle>
                      <v-list-item-title>{{workerGroup.machine.type}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                  <v-list-item class="px-0" v-if="workerGroup.zones && workerGroup.zones.length">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Zones</v-list-item-subtitle>
                      <v-list-item-title class="d-flex flex-wrap"><v-chip small label outlined class="px-1 mr-1" v-for="zone in workerGroup.zones" :key="zone">{{zone}}</v-chip></v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
                <v-list class="pa-0 flex-grow-1" v-if="machineType">
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>CPUs</v-list-item-subtitle>
                      <v-list-item-title>{{machineType.cpu}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>GPUs</v-list-item-subtitle>
                      <v-list-item-title>{{machineType.gpu}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Memory</v-list-item-subtitle>
                      <v-list-item-title>{{machineType.memory}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
            <v-card outlined class="d-flex flex-column flex-grow-1 mx-1 my-2">
              <v-system-bar>
                <v-icon class="mr-3">mdi-harddisk</v-icon>
                <span>Volume</span>
              </v-system-bar>
              <v-card-text class="pa-2 d-flex">
                <v-list class="pa-0 flex-grow-1">
                  <v-list-item class="px-0" v-if="volumeCardData.type">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Type</v-list-item-subtitle>
                      <v-list-item-title>{{volumeCardData.type}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                  <v-list-item class="px-0" v-if="volumeCardData.class">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Class</v-list-item-subtitle>
                      <v-list-item-title>{{volumeCardData.class}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
                <v-list class="pa-0 flex-grow-1" v-if="volumeCardData.size">
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Size</v-list-item-subtitle>
                      <v-list-item-title>{{volumeCardData.size}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" class="pa-0">
            <v-card outlined class="d-flex flex-column flex-grow-1 mx-1 my-2">
              <v-system-bar>
                <v-icon class="mr-3">mdi-disc</v-icon>
                <span>Image</span>
              </v-system-bar>
              <v-card-text class="pa-2 d-flex">
                <v-list class="pa-0 flex-grow-1">
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Name</v-list-item-subtitle>
                      <v-list-item-title>{{workerGroup.machine.image.name}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Version</v-list-item-subtitle>
                      <v-list-item-title>{{workerGroup.machine.image.version}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
                <v-list class="pa-0 flex-grow-1">
                  <v-list-item class="px-0" v-if="!machineImage">
                    <v-list-item-content class="pa-0">
                      <div class="d-flex align-start"><v-icon small class="mr-1" color="warning">mdi-alert</v-icon>Image not found in cloud profile</div>
                    </v-list-item-content>
                  </v-list-item>
                  <v-list-item class="px-0" v-if="machineImage && machineImage.expirationDate">
                    <v-list-item-content class="pa-0">
                      <div class="d-flex align-start"><v-icon small class="mr-1" color="warning">mdi-alert</v-icon>Image expires on {{machineImage.expirationDateString}}</div>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
            <v-card outlined class="d-flex flex-column flex-grow-1 mx-1 my-2">
              <v-system-bar>
                <v-icon class="mr-3">mdi-chart-line-variant</v-icon>
                <span>Autoscaler</span>
              </v-system-bar>
              <v-card-text class="pa-2 d-flex">
                <v-list class="pa-0 flex-grow-1">
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Maximum</v-list-item-subtitle>
                      <v-list-item-title>{{workerGroup.maximum}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Minimum</v-list-item-subtitle>
                      <v-list-item-title>{{workerGroup.minimum}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
                <v-list class="pa-0 flex-grow-1">
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Max. Surge</v-list-item-subtitle>
                      <v-list-item-title>{{workerGroup.maxSurge}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Max. Unavailable</v-list-item-subtitle>
                      <v-list-item-title>{{workerGroup.maxUnavailable}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
            <v-card outlined class="d-flex flex-column flex-grow-1 mx-1 my-2">
              <v-system-bar>
                <v-icon class="mr-3">mdi-oci</v-icon>
                <span>Container Runtime</span>
              </v-system-bar>
              <v-card-text class="pa-2 d-flex">
                <v-list class="pa-0 flex-grow-1">
                  <v-list-item class="px-0">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Name</v-list-item-subtitle>
                      <v-list-item-title>{{workerGroup.cri.name}}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                  <v-list-item class="px-0" v-if="workerGroup.cri.containerRuntimes && workerGroup.cri.containerRuntimes.length">
                    <v-list-item-content class="pa-0">
                      <v-list-item-subtitle>Additional OCI Runtimes</v-list-item-subtitle>
                      <v-list-item-title class="d-flex flex-wrap"><v-chip small label outlined class="px-1 mr-1" v-for="containerRuntime in workerGroup.cri.containerRuntimes" :key="containerRuntime.type">{{containerRuntime.type}}</v-chip></v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-tab-item>
      <v-tab-item id="yaml">
        <code-block lang="yaml" :content="workerGroupYaml"></code-block>
      </v-tab-item>
    </v-tabs-items>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper'
import VendorIcon from '@/components/VendorIcon'
import CodeBlock from '@/components/CodeBlock'
import find from 'lodash/find'
import get from 'lodash/get'
import { mapGetters } from 'vuex'

export default {
  name: 'worker-group',
  components: {
    GPopper,
    VendorIcon,
    CodeBlock
  },
  props: {
    workerGroup: {
      type: Object
    },
    cloudProfileName: {
      type: String
    },
    value: {
      type: String
    }
  },
  data () {
    return {
      workerGroupYaml: undefined
    }
  },
  computed: {
    ...mapGetters([
      'machineTypesByCloudProfileName',
      'volumeTypesByCloudProfileName',
      'machineImagesByCloudProfileName'
    ]),
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
          size: volumeSize
        }
      }

      // workers with storage in machine type metadata (e.g. openstack)
      if (storage.type) {
        return {
          type: storage.type,
          class: storage.class,
          size: volumeSize
        }
      }
      return {}
    },
    machineImage () {
      const machineImages = this.machineImagesByCloudProfileName(this.cloudProfileName)
      const { name, version } = get(this.workerGroup, 'machine.image', {})
      return find(machineImages, { name, version })
    },
    machineImageIcon () {
      return get(this.machineImage, 'icon')
    },
    tab: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    }
  },
  methods: {
    async updateWorkerGroupYaml (value) {
      this.workerGroupYaml = await this.$yaml.dump(value)
    }
  },
  created () {
    this.updateWorkerGroupYaml(this.workerGroup)
  }
}
</script>

<style lang="scss" scoped>
  ::v-deep .popper {
    text-align: initial;
    width: 600px;
  }
</style>
