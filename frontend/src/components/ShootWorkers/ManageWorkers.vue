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
    <v-layout row v-for="(worker, index) in internalWorkers" :key="worker.id" class="list-item pt-2" :class="{ 'grey lighten-5': index % 2 }">
      <worker-input-generic
        ref="workerInput"
        :worker="worker"
        :workers="internalWorkers"
        :cloudProfileName="cloudProfileName"
        :region="region"
        :availableZones="availableZones"
        :updateOSMaintenance="updateOSMaintenance"
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
      <v-flex>
        <v-btn
          :disabled="!(allMachineTypes.length > 0)"
          small
          @click="addWorker"
          outline
          fab
          icon
          class="cyan darken-2 ml-1">
          <v-icon class="cyan--text text--darken-2">add</v-icon>
        </v-btn>
        <v-btn
          :disabled="!(allMachineTypes.length > 0)"
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
import WorkerInputGeneric from '@/components/ShootWorkers/WorkerInputGeneric'
import { mapGetters } from 'vuex'
import { generateWorker } from '@/utils'
import forEach from 'lodash/forEach'
import find from 'lodash/find'
import map from 'lodash/map'
import omit from 'lodash/omit'
import assign from 'lodash/assign'
import isEmpty from 'lodash/isEmpty'
const uuidv4 = require('uuid/v4')

export default {
  name: 'manage-workers',
  components: {
    WorkerInputGeneric
  },
  props: {
    userInterActionBus: {
      type: Object
    }
  },
  data () {
    return {
      internalWorkers: undefined,
      valid: false,
      cloudProfileName: undefined,
      region: undefined,
      zonesNetworkConfiguration: undefined,
      updateOSMaintenance: undefined
    }
  },
  computed: {
    ...mapGetters([
      'cloudProfileByName',
      'machineTypesByCloudProfileNameAndZones',
      'zonesByCloudProfileNameAndRegion'
    ]),
    allMachineTypes () {
      return this.machineTypesByCloudProfileNameAndZones({ cloudProfileName: this.cloudProfileName })
    },
    allZones () {
      return this.zonesByCloudProfileNameAndRegion({ cloudProfileName: this.cloudProfileName, region: this.region })
    },
    availableZones () {
      // Ensure that only zones can be selected, that have a network config in providerConfig (if required)
      // Can be removed when gardener supports to change network config afterwards
      // --> Allow adding zones post-shoot creation PR: https://github.com/gardener/gardener/pull/1587
      const zonesWithNetworkConfigInShoot = map(this.zonesNetworkConfiguration, 'name')
      if (!isEmpty(zonesWithNetworkConfigInShoot)) {
        return zonesWithNetworkConfigInShoot
      }
      return this.allZones
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
      const worker = generateWorker(this.availableZones, this.cloudProfileName, this.region)
      this.internalWorkers.push(worker)
      this.validateInput()
    },
    onRemoveWorker (index) {
      this.internalWorkers.splice(index, 1)
      // Need to evaluate the other components as well, as valid state may depend on each other (e.g. duplicate name)
      // Lack of doing so can lead to worker valid state != true even if conflict has been resolved, if input happens
      // on component which did not report valid = false in the first place
      forEach(this.$refs.workerInput, workerInput => {
        workerInput.validateInput()
      })
      this.validateInput()
    },
    setDefaultWorker () {
      this.internalWorkers = []
      this.addWorker()
    },
    onWorkerValid ({ valid, id }) {
      const worker = find(this.internalWorkers, { id })
      if (worker) {
        // if worker has been removed and we receive a valid event ->ignore
        const wasValid = worker.valid
        worker.valid = valid
        if (valid !== wasValid) {
          // Need to evaluate the other components as well, as valid state may depend on each other (e.g. duplicate name)
          // Lack of doing so can lead to worker valid state != true even if conflict has been resolved, if input happens
          // on component which did not report valid = false in the first place
          forEach(this.$refs.workerInput, workerInput => {
            workerInput.validateInput()
          })
        }
        this.validateInput()
      }
    },
    getWorkers () {
      const workers = map(this.internalWorkers, internalWorker => {
        return omit(internalWorker, ['id', 'valid'])
      })
      return workers
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
    },
    setWorkersData ({ workers, cloudProfileName, region, zonesNetworkConfiguration, updateOSMaintenance }) {
      this.cloudProfileName = cloudProfileName
      this.region = region
      this.zonesNetworkConfiguration = zonesNetworkConfiguration
      this.updateOSMaintenance = updateOSMaintenance
      this.setInternalWorkers(workers)
    }
  },
  mounted () {
    if (this.userInterActionBus) {
      this.userInterActionBus.on('updateCloudProfileName', cloudProfileName => {
        this.internalWorkers = []
        this.cloudProfileName = cloudProfileName
        this.setDefaultWorker()
      })
      this.userInterActionBus.on('updateRegion', region => {
        this.region = region
        this.setDefaultWorker()
      })
      this.userInterActionBus.on('updateOSMaintenance', updateOSMaintenance => {
        this.updateOSMaintenance = updateOSMaintenance
      })
    }
  }
}
</script>
