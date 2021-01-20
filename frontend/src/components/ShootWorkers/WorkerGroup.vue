<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

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
        {{workerGroup.name}}
      </v-chip>
    </template>
    <v-list class="pa-0">
      <v-list-item v-for="({title, value, description}) in description" :key="title" class="px-0">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>{{title}}</v-list-item-subtitle>
          <v-list-item-title>{{value}} {{description}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper'
import find from 'lodash/find'
import join from 'lodash/join'
import get from 'lodash/get'
import { mapGetters } from 'vuex'

export default {
  name: 'worker-group',
  components: {
    GPopper
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
    machineTypes () {
      return this.machineTypesByCloudProfileName({ cloudProfileName: this.cloudProfileName })
    },
    volumeTypes () {
      return this.volumeTypesByCloudProfileName({ cloudProfileName: this.cloudProfileName })
    },
    machineImages () {
      return this.machineImagesByCloudProfileName(this.cloudProfileName)
    },
    description () {
      const description = []
      description.push(this.getMachineTpeDescription())
      const volumeTypeDescription = this.getVolumeTypeDescription()
      if (volumeTypeDescription) {
        description.push(volumeTypeDescription)
      }
      const volumeSizeDescription = this.getVolumeSizeDescription()
      if (volumeTypeDescription) {
        description.push(volumeSizeDescription)
      }
      description.push(this.getMachineImageDescription())

      const { minimum, maximum, maxSurge, zones = [] } = this.workerGroup
      if (minimum && maximum) {
        description.push({
          title: 'Autoscaler',
          value: `Min. ${minimum} / Max. ${maximum}`
        })
      }
      if (maxSurge) {
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
    }
  },
  methods: {
    getMachineTpeDescription () {
      const { machine } = this.workerGroup
      const item = {
        title: 'Machine Type',
        value: machine.type
      }

      const machineMetadata = find(this.machineTypes, ['name', machine.type])
      if (machineMetadata) {
        item.description = `(CPU: ${machineMetadata.cpu} | GPU: ${machineMetadata.gpu} | Memory: ${machineMetadata.memory})`
      }

      return item
    },
    getVolumeTypeDescription () {
      // workers with volume type (e.g. aws)
      const { volume } = this.workerGroup
      if (volume && volume.type) {
        const item = {
          title: 'Volume Type',
          value: volume.type
        }

        const volumeMetadata = find(this.volumeTypes, ['name', volume.type])
        if (volumeMetadata) {
          item.description = `(Class: ${volumeMetadata.class})`
        }

        return item
      }

      // workers with storage in machine type metadata (e.g. openstack)
      const { machine } = this.workerGroup
      const machineMetadata = find(this.machineTypes, ['name', machine.type])
      const storageType = get(machineMetadata, 'storage.type')
      if (storageType) {
        return {
          title: 'Volume Type',
          value: storageType,
          description: `(Class: ${machineMetadata.storage.class})`
        }
      }
    },
    getVolumeSizeDescription () {
      // all infras support volume sizes, but for some they are optional
      const { volume } = this.workerGroup
      const volumeSize = get(volume, 'size')
      if (volume && volume.size) {
        return {
          title: 'Volume Size',
          value: `${volumeSize}`
        }
      }

      // if no size is defined on the worker itself, check if machine storage defines a default size
      const { machine } = this.workerGroup
      const machineMetadata = find(this.machineTypes, ['name', machine.type])
      const storageSize = get(machineMetadata, 'storage.size')
      if (storageSize) {
        return {
          title: 'Volume Size',
          value: `${storageSize}`
        }
      }
    },
    getMachineImageDescription () {
      const { machine: { image: { name, version } } } = this.workerGroup
      const item = {
        title: 'Machine Image',
        value: `${name} | Version: ${version}`
      }

      const machineImageMetadata = find(this.machineImages, { name, version })
      if (!machineImageMetadata) {
        item.description = '(Image is expired)'
      } else if (machineImageMetadata.expirationDate) {
        item.description = `(Expires: ${machineImageMetadata.expirationDateString})`
      }

      return item
    }
  }
}
</script>

<style lang="scss" scoped>
  ::v-deep .popper {
    text-align: initial;
  }
</style>
