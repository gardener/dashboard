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
import compact from 'lodash/compact'
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
      const { machine, volume, minimum, maximum, maxSurge, zones = [] } = this.workerGroup
      const machineType = find(this.machineTypes, { name: machine.type })
      const volumeType = find(this.volumeTypes, { name: get(volume, 'type') })
      const machineImage = find(this.machineImages, machine.image)

      const description = []
      description.push(this.machineTpeDescription(machine, machineType))
      description.push(this.volumeTpeDescription(machine, machineType, volume, volumeType))
      description.push(this.volumeSizeDescription(machine, machineType, volume))
      description.push(this.machineImageDescription(machine, machineImage))

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

      return compact(description)
    }
  },
  methods: {
    machineTpeDescription (machine, machineType) {
      if (machineType) {
        return {
          title: 'Machine Type',
          value: machineType.name,
          description: `(CPU: ${machineType.cpu} | GPU: ${machineType.gpu} | Memory: ${machineType.memory})`
        }
      }
      return {
        title: 'Machine Type',
        value: machine.type
      }
    },
    volumeTpeDescription (machine, machineType, volume, volumeType) {
      if (volume) {
        if (volumeType) {
          return {
            title: 'Volume Type',
            value: volumeType.name,
            description: `(Class: ${volumeType.class})`
          }
        }
        return {
          title: 'Volume Type',
          value: volume.type
        }
      }

      const storageType = get(machineType, 'storage.type')
      if (storageType) {
        return {
          title: 'Volume Type',
          value: storageType,
          description: `(Class: ${machineType.storage.class})`
        }
      }
    },
    volumeSizeDescription (machine, machineType, volume) {
      const volumeSize = get(volume, 'size')
      if (volumeSize) {
        return {
          title: 'Volume Size',
          value: `${volumeSize}`
        }
      }

      const storageSize = get(machineType, 'storage.size')
      if (storageSize) {
        return {
          title: 'Volume Size',
          value: `${storageSize}`
        }
      }
    },
    machineImageDescription (machine, machineImage) {
      if (machineImage) {
        const machineImageDescription = {
          title: 'Machine Image',
          value: `${machineImage.name} | Version: ${machineImage.version}`
        }
        if (machineImage.expirationDate) {
          machineImageDescription.description = `(Expires: ${machineImage.expirationDateString})`
        }
        return machineImageDescription
      }

      if (machine.image.name) {
        return {
          title: 'Machine Image',
          value: `${machineImage.name} | Version: ${machineImage.version}`
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  ::v-deep .popper {
    text-align: initial;
  }
</style>
