<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    <v-row v-for="(worker, index) in internalWorkers" :key="worker.id" class="list-item pt-2" :class="{ 'grey lighten-5': index % 2 }">
      <worker-input-generic
        ref="workerInput"
        :worker="worker"
        :workers="internalWorkers"
        :cloudProfileName="cloudProfileName"
        :region="region"
        :availableZones="availableZones"
        :zonedCluster="zonedCluster"
        :updateOSMaintenance="updateOSMaintenance"
        :isNewWorker="isNewCluster || worker.isNewWorker"
        :maxAdditionalZones="maxAdditionalZones"
        @valid="onWorkerValid">
        <template v-slot:action>
          <v-btn v-show="index > 0 || internalWorkers.length > 1"
            small
            outlined
            icon
            color="grey"
            @click.native.stop="onRemoveWorker(index)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </template>
      </worker-input-generic>
    </v-row>
    <v-row key="addWorker" class="list-item pt-2">
      <v-col>
        <v-btn
          :disabled="!(allMachineTypes.length > 0)"
          small
          @click="addWorker"
          outlined
          fab
          icon
          class="ml-1"
          color="cyan darken-2">
          <v-icon class="cyan--text text--darken-2">add</v-icon>
        </v-btn>
        <v-btn
          :disabled="!(allMachineTypes.length > 0)"
          @click="addWorker"
          text
          class="cyan--text text--darken-2">
          Add Worker Group
        </v-btn>
      </v-col>
    </v-row>
  </transition-group>
</template>

<script>
import WorkerInputGeneric from '@/components/ShootWorkers/WorkerInputGeneric'
import { mapGetters } from 'vuex'
import { generateWorker, isZonedCluster } from '@/utils'
import { findFreeNetworks, getZonesNetworkConfiguration } from '@/utils/createShoot'
import forEach from 'lodash/forEach'
import find from 'lodash/find'
import map from 'lodash/map'
import omit from 'lodash/omit'
import assign from 'lodash/assign'
import isEmpty from 'lodash/isEmpty'
import sortBy from 'lodash/sortBy'
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
      zonedCluster: undefined,
      updateOSMaintenance: undefined,
      isNewCluster: false,
      existingWorkerCIDR: undefined
    }
  },
  computed: {
    ...mapGetters([
      'machineTypesByCloudProfileName',
      'zonesByCloudProfileNameAndRegion',
      'cloudProfileByName'
    ]),
    allMachineTypes () {
      return this.machineTypesByCloudProfileName({ cloudProfileName: this.cloudProfileName })
    },
    allZones () {
      return this.zonesByCloudProfileNameAndRegion({ cloudProfileName: this.cloudProfileName, region: this.region })
    },
    currentZonesWithNetworkConfigInShoot () {
      return map(this.currentZonesNetworkConfiguration, 'name')
    },
    currentFreeNetworks () {
      return findFreeNetworks(this.currentZonesNetworkConfiguration, this.existingWorkerCIDR, this.cloudProviderKind, this.allZones.length)
    },
    availableZones () {
      // Ensure that only zones can be selected, that have a network config in providerConfig (if required)
      // or that free networks are available to use more zones
      if (!isEmpty(this.currentZonesWithNetworkConfigInShoot)) {
        if (!this.currentFreeNetworks.length) {
          return sortBy(this.currentZonesWithNetworkConfigInShoot)
        }
      }
      return sortBy(this.allZones)
    },
    maxAdditionalZones () {
      if (!isEmpty(this.currentZonesWithNetworkConfigInShoot)) {
        if (this.currentZonesWithNetworkConfigInShoot.length + this.currentFreeNetworks.length < this.allZones.length) {
          return this.currentFreeNetworks.length
        }
      }
      return 0 // no limit
    },
    cloudProviderKind () {
      const cloudProfile = this.cloudProfileByName(this.cloudProfileName)
      return cloudProfile.metadata.cloudProviderKind
    },
    currentZonesNetworkConfiguration () {
      return getZonesNetworkConfiguration(this.zonesNetworkConfiguration, this.internalWorkers, this.cloudProviderKind, this.allZones.length, this.existingWorkerCIDR)
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
      if (!worker) {
        // if worker has been removed and we receive an onWorkerValid event for this worker ->ignore
        return
      }
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
    },
    getWorkers () {
      const workers = map(this.internalWorkers, internalWorker => {
        return omit(internalWorker, ['id', 'valid', 'isNewWorker'])
      })
      return workers
    },
    getZonesNetworkConfiguration () {
      return this.currentZonesNetworkConfiguration
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
    setWorkersData ({ workers, cloudProfileName, region, zonesNetworkConfiguration, updateOSMaintenance, zonedCluster, existingWorkerCIDR }) {
      this.cloudProfileName = cloudProfileName
      this.region = region
      this.zonesNetworkConfiguration = zonesNetworkConfiguration
      this.updateOSMaintenance = updateOSMaintenance
      this.setInternalWorkers(workers)
      this.zonedCluster = zonedCluster
      this.isNewCluster = !existingWorkerCIDR
      this.existingWorkerCIDR = existingWorkerCIDR
    }
  },
  mounted () {
    if (this.userInterActionBus) {
      this.userInterActionBus.on('updateCloudProfileName', cloudProfileName => {
        this.internalWorkers = []
        this.cloudProfileName = cloudProfileName
        /*
         * do not pass shootspec as we have it not available in this component and it is (currently) not required to determined isZoned for new clusters. This event handler is only be called for new clusters, as the
         * userInterActionBus is onlyset for the create cluster use case
         */
        this.zonedCluster = isZonedCluster({ cloudProviderKind: this.cloudProviderKind, isNewCluster: this.isNewCluster })
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
