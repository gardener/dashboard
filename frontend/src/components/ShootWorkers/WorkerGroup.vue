<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <g-popper
    :title="workerGroup.name"
    toolbarColor="cyan darken-2"
    :popperKey="`worker_group_${workerGroup.name}`"

  >
    <v-layout row
     slot="content-before"
     v-for="(line,index) in description"
     :key="index"
     fill-height
     align-center>
     <span class="ma-1">
       <span class="font-weight-bold">{{line.title}}:</span> {{line.value}} {{line.description}}
     </span>
    </v-layout>
    <v-chip
      slot="popperRef"
      small
      class="cursor-pointer my-0 ml-0"
      outline
      color="cyan darken-2">
      {{workerGroup.name}}
    </v-chip>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper'
import find from 'lodash/find'
import join from 'lodash/join'
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
      'machineTypesByCloudProfileNameAndZones',
      'volumeTypesByCloudProfileNameAndZones',
      'machineImagesByCloudProfileName'
    ]),
    machineTypes () {
      return this.machineTypesByCloudProfileNameAndZones({ cloudProfileName: this.cloudProfileName })
    },
    volumeTypes () {
      return this.volumeTypesByCloudProfileNameAndZones({ cloudProfileName: this.cloudProfileName })
    },
    machineImages () {
      return this.machineImagesByCloudProfileName(this.cloudProfileName)
    },
    description () {
      const description = []
      if (this.workerGroup.machine.type) {
        const machineType = find(this.machineTypes, { name: this.workerGroup.machine.type })
        if (machineType) {
          description.push({
            title: 'Machine Type',
            value: machineType.name,
            description: `(CPU: ${machineType.cpu} | GPU: ${machineType.gpu} | Memory: ${machineType.memory})`
          })
          if (machineType.storage) {
            description.push({
              title: 'Volume Size',
              value: `${machineType.storage.size}`
            })
          }
        } else {
          description.push({
            title: 'Machine Type',
            value: this.workerGroup.machine.type
          })
        }
      }
      if (this.workerGroup.volume) {
        const volumeType = find(this.volumeTypes, { name: this.workerGroup.volume.type })
        if (volumeType) {
          description.push({
            title: 'Volume Type',
            value: `${volumeType.name} / ${this.workerGroup.volume.size}`,
            description: `(Class: ${volumeType.class})`
          })
        } else {
          description.push({
            title: 'Volume Type',
            value: this.workerGroup.volume.type
          })
        }
      }
      if (this.workerGroup.machine.image) {
        const machineImage = find(this.machineImages, this.workerGroup.machine.image)

        if (machineImage) {
          const machineImageDescription = {
            title: 'Machine Image',
            value: `${machineImage.name} | Version: ${machineImage.version}`
          }
          if (machineImage.expirationDate) {
            machineImageDescription.description = `(Expires: ${machineImage.expirationDateString})`
          }
          description.push(machineImageDescription)
        } else {
          description.push({
            title: 'Machine Image',
            value: this.workerGroup.machine.image
          })
        }
      }
      if (this.workerGroup.minimum && this.workerGroup.maximum) {
        description.push({
          title: 'Autoscaler',
          value: `Min. ${this.workerGroup.minimum} / Max. ${this.workerGroup.maximum}`
        })
      }
      if (this.workerGroup.maxSurge) {
        description.push({
          title: 'Max. Surge',
          value: `${this.workerGroup.maxSurge}`
        })
      }
      if (this.workerGroup.zones) {
        description.push({
          title: this.workerGroup.zones.length > 1 ? 'Zones' : 'Zone',
          value: join(this.workerGroup.zones, ', ')
        })
      }
      return description
    }
  }
}
</script>

<style lang="styl" scoped>
  .cursor-pointer >>> .v-chip__content {
    cursor: pointer;
  }
</style>
