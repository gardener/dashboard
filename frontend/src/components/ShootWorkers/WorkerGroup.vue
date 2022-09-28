<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    :title="workerGroup.name"
    :popper-key="`worker_group_${workerGroup.name}`"
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
      class="mb-3">
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
        <v-row class="ma-0">
          <v-col cols="6" v-for="data in workerGroupData" :key="data[0].title">
            <v-row v-for="({title, icon, items}) in data" :key="title" class="pa-1">
              <v-card outlined class="d-flex flex-column flex-grow-1">
                <v-system-bar>
                  <v-icon class="mr-3">{{icon}}</v-icon>
                  <span>{{title}}</span>
                </v-system-bar>
                <v-card-text class="pa-2 d-flex">
                  <v-list class="pa-0 flex-grow-1" v-for="column in items" :key="column.title">
                    <v-list-item class="px-0" v-for="{title, value} in column" :key="title">
                      <v-list-item-content class="pa-0">
                        <v-list-item-subtitle>{{title}}</v-list-item-subtitle>
                        <v-list-item-title>{{value}}</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-row>
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
import chunk from 'lodash/chunk'
import { mapGetters } from 'vuex'
import { workerGroupData } from '@/utils'

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
    }
  },
  data () {
    return {
      tab: 'overview',
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
    machineImage () {
      const machineImages = this.machineImagesByCloudProfileName(this.cloudProfileName)
      const { name, version } = get(this.workerGroup, 'machine.image', {})
      return find(machineImages, { name, version })
    },
    workerGroupData () {
      const data = workerGroupData(this.machineType, this.machineImage, this.volumeType, this.workerGroup)
      return chunk(data, Math.ceil(data.length / 2))
    },
    machineImageIcon () {
      return get(this.machineImage, 'icon')
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
