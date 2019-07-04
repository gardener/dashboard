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
  <transition-group name="list">
    <v-layout row v-for="(worker, index) in internalWorkers" :key="worker.id"  class="list-item pt-2">
      <worker-input-generic
        ref="workerInput"
        :worker="worker"
        :workers="internalWorkers"
        :infrastructureKind="infrastructureKind"
        :cloudProfileName="cloudProfileName"
        :zone="zone"
        @updateName="onUpdateWorkerName"
        @updateMachineType="onUpdateWorkerMachineType"
        @updateVolumeType="onUpdateWorkerVolumeType"
        @updateVolumeSize="onUpdateWorkerVolumeSize"
        @updateAutoscalerMin="onUpdateWorkerAutoscalerMin"
        @updateAutoscalerMax="onUpdateWorkerAutoscalerMax"
        @valid="onWorkerValid">
        <v-btn v-show="index>0 || internalWorkers.length>1"
          small
          slot="action"
          outline
          icon
          class="grey--text lighten-2"
          @click.native.stop="onRemoveWorker(index)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </worker-input-generic>
    </v-layout>
    <v-layout row key="addWorker" class="list-item pt-2">
      <v-flex xs12>
        <v-btn
          small
          @click="addWorker"
          outline
          fab
          icon
          class="cyan darken-2 ml-1">
          <v-icon class="cyan--text text--darken-2">add</v-icon>
        </v-btn>
        <v-btn
          @click="addWorker"
          flat
          class="cyan--text text--darken-2">
          Add Worker Group
        </v-btn>
      </v-flex>
    </v-layout>
  </transition-group>
</template>

<script>
import WorkerInputGeneric from '@/components/WorkerInputGeneric'
import { mapGetters } from 'vuex'
import { shortRandomString } from '@/utils'
import forEach from 'lodash/forEach'
import get from 'lodash/get'
import find from 'lodash/find'
import head from 'lodash/head'
import omit from 'lodash/omit'
import assign from 'lodash/assign'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
const uuidv4 = require('uuid/v4')

export default {
  name: 'manage-workers',
  components: {
    WorkerInputGeneric
  },
  props: {
    workers: {
      type: Array
    },
    infrastructureKind: {
      type: String
    },
    cloudProfileName: {
      type: String
    },
    zone: {
      type: String
    }
  },
  data () {
    return {
      internalWorkers: undefined,
      valid: false
    }
  },
  computed: {
    ...mapGetters([
      'cloudProfileByName',
      'machineTypesByCloudProfileName',
      'volumeTypesByCloudProfileName'
    ]),
    machineTypes () {
      switch (this.infrastructureKind) {
        case 'alicloud':
          let allMachineTypesByCloudProfileName = this.machineTypesByCloudProfileName(this.cloudProfileName)
          return filter(allMachineTypesByCloudProfileName, machineType => includes(get(machineType, 'zones'), this.zone) === true)
        default:
          return this.machineTypesByCloudProfileName(this.cloudProfileName)
      }
    },
    volumeTypes () {
      switch (this.infrastructureKind) {
        case 'alicloud':
          let allVolumeTypesByCloudProfileName = this.volumeTypesByCloudProfileName(this.cloudProfileName)
          return filter(allVolumeTypesByCloudProfileName, volumeType => includes(get(volumeType, 'zones'), this.zone) === true)
        default:
          return this.volumeTypesByCloudProfileName(this.cloudProfileName)
      }
    }
  },
  methods: {
    setInternalWorkers (workers) {
      this.internalWorkers = []
      if (workers) {
        forEach(workers, worker => {
          const id = uuidv4()
          const internalWorker = assign({}, worker, { id })
          this.internalWorkers.push(internalWorker)
        })
      }
      this.validateInput()
    },
    addWorker () {
      const id = uuidv4()
      const volumeType = get(head(this.volumeTypes), 'name')
      const volumeSize = volumeType ? '50Gi' : undefined
      this.internalWorkers.push({
        id,
        name: `worker-${shortRandomString(5)}`,
        machineType: get(head(this.machineTypes), 'name'),
        volumeType,
        volumeSize,
        autoScalerMin: 1,
        autoScalerMax: 2
      })
      this.validateInput()
    },
    onRemoveWorker (index) {
      this.internalWorkers.splice(index, 1)
      this.validateInput()
    },
    setDefaultWorker () {
      this.internalWorkers = []
      this.addWorker()
    },
    removeInvalidWorkerMachineTypesAndVolumeTypes () {
      let machineTypeNames = []
      let volumeTypeNames = []
      forEach(this.machineTypes, machineType => {
        const machineTypeName = get(machineType, 'name')
        machineTypeNames.push(machineTypeName)
      })
      forEach(this.volumeTypes, volumeType => {
        const volumeTypeName = get(volumeType, 'name')
        volumeTypeNames.push(volumeTypeName)
      })
      forEach(this.internalWorkers, worker => {
        if (includes(machineTypeNames, worker.machineType) === false) {
          worker.machineType = undefined
          worker.valid = false
        }
        if (includes(volumeTypeNames, worker.volumeType) === false) {
          worker.volumeType = undefined
          worker.valid = false
        }
      })
      this.validateInput()
    },
    onUpdateWorkerName ({ name, id }) {
      const worker = find(this.internalWorkers, { id })
      worker.name = name
    },
    onUpdateWorkerMachineType ({ machineType, id }) {
      const worker = find(this.internalWorkers, { id })
      worker.machineType = machineType
    },
    onUpdateWorkerVolumeType ({ volumeType, id }) {
      const worker = find(this.internalWorkers, { id })
      worker.volumeType = volumeType
    },
    onUpdateWorkerVolumeSize ({ volumeSize, id }) {
      const worker = find(this.internalWorkers, { id })
      worker.volumeSize = volumeSize
    },
    onUpdateWorkerAutoscalerMin ({ autoScalerMin, id }) {
      const worker = find(this.internalWorkers, { id })
      worker.autoScalerMin = autoScalerMin
    },
    onUpdateWorkerAutoscalerMax ({ autoScalerMax, id }) {
      const worker = find(this.internalWorkers, { id })
      worker.autoScalerMax = autoScalerMax
    },
    onWorkerValid ({ valid, id }) {
      const worker = find(this.internalWorkers, { id })
      worker.valid = valid

      this.validateInput()
    },
    getWorkers () {
      const workers = []
      forEach(this.internalWorkers, internalWorker => {
        const worker = omit(internalWorker, 'id')
        workers.push(worker)
      })
      return workers
    },
    reset () {
      this.setInternalWorkers(this.workers)
    },
    validateInput () {
      let valid = true
      forEach(this.internalWorkers, worker => {
        if (!worker.valid) {
          valid = false
        }
      })

      this.valid = valid
      this.$emit('valid', this.valid)
    }
  },
  mounted () {
    this.setInternalWorkers(this.workers)
  }
}
</script>

<style lang="styl" scoped>

.add_worker{
  margin-left: 30px;
  border: 0;
}
</style>
