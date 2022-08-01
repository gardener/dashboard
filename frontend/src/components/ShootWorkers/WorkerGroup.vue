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
    <v-list class="pa-0">
      <v-list-item v-for="({title, architecture, value, description}) in workerGroupDescriptions" :key="title" class="px-0">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>
            {{title}}
            <v-chip v-if="architecture" color="primary" label x-small class="ml-2 px-1" :key="architecture" outlined>{{architecture}}</v-chip>
          </v-list-item-subtitle>
          <v-list-item-title>{{value}} {{description}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper'
import VendorIcon from '@/components/VendorIcon'
import find from 'lodash/find'
import join from 'lodash/join'
import get from 'lodash/get'
import { mapGetters } from 'vuex'

export default {
  name: 'worker-group',
  components: {
    GPopper,
    VendorIcon
  },
  props: {
    workerGroup: {
      type: Object
    },
    cloudProfileName: {
      type: String
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
    workerGroupDescriptions () {
      const description = []
      description.push(this.machineTypeDescription)
      const volumeTypeDescription = this.volumeTypeDescription
      if (volumeTypeDescription) {
        description.push(volumeTypeDescription)
      }
      const volumeSizeDescription = this.volumeSizeDescription
      if (volumeSizeDescription) {
        description.push(volumeSizeDescription)
      }
      description.push(this.machineImageDescription)

      const { minimum, maximum, maxSurge, zones = [] } = this.workerGroup
      if (minimum >= 0 && maximum >= 0) {
        description.push({
          title: 'Autoscaler',
          value: `Min. ${minimum} / Max. ${maximum}`
        })
      }
      if (maxSurge >= 0) {
        description.push({
          title: 'Max. Surge',
          value: `${maxSurge}`
        })
      }
      if (zones.length) {
        description.push({
          title: zones.length > 1 ? 'Zones' : 'Zone',
          value: join(zones, ', ')
        })
      }

      return description
    },
    machineTypeDescription () {
      const machine = get(this.workerGroup, 'machine', {})
      const item = {
        title: 'Machine Type',
        value: machine.type
      }

      const machineType = this.machineType
      if (machineType) {
        item.description = `(CPU: ${machineType.cpu} | GPU: ${machineType.gpu} | Memory: ${machineType.memory})`
        item.architecture = machineType.architecture
      }

      return item
    },
    volumeTypeDescription () {
      // workers with volume type (e.g. aws)
      const volume = get(this.workerGroup, 'volume', {})
      if (volume.type) {
        const item = {
          title: 'Volume Type',
          value: volume.type
        }

        const volumeType = this.volumeType
        if (volumeType) {
          item.description = `(Class: ${volumeType.class})`
        }

        return item
      }

      // workers with storage in machine type metadata (e.g. openstack)
      const storage = get(this.machineType, 'storage', {})
      if (storage.type) {
        return {
          title: 'Volume Type',
          value: storage.type,
          description: `(Class: ${storage.class})`
        }
      }

      return undefined
    },
    volumeSizeDescription () {
      // all infrastructures support volume sizes, but for some they are optional
      const volume = get(this.workerGroup, 'volume', {})
      if (volume.size) {
        return {
          title: 'Volume Size',
          value: `${volume.size}`
        }
      }

      // if no size is defined on the worker itself, check if machine storage defines a default size
      const storage = get(this.machineType, 'storage', {})
      if (storage.size) {
        return {
          title: 'Volume Size',
          value: `${storage.size}`
        }
      }

      return undefined
    },
    machineImageDescription () {
      const { name, version } = get(this.workerGroup, 'machine.image', {})
      const item = {
        title: 'Machine Image',
        value: `${name} | Version: ${version}`
      }

      const machineImage = this.machineImage
      if (!machineImage) {
        item.description = '(Image is expired)'
      } else {
        if (machineImage.expirationDate) {
          item.description = `(Expires: ${machineImage.expirationDateString})`
        }
      }

      return item
    },
    machineImageIcon () {
      return get(this.machineImage, 'icon')
    }
  }
}
</script>

<style lang="scss" scoped>
  ::v-deep .popper {
    text-align: initial;
  }
</style>
