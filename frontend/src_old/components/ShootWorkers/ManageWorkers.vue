<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="alternate-row-background">
    <v-expand-transition
      :appear="animateOnAppear"
      v-for="(worker, index) in internalWorkers"
      :key="worker.id"
    >
      <v-row class="list-item pt-2 my-0 mx-1" :key="worker.id">
        <worker-input-generic
          ref="workerInput"
          :worker="worker"
          :workers="internalWorkers"
          :cloud-profile-name="cloudProfileName"
          :region="region"
          :all-zones="allZones"
          :available-zones="availableZones"
          :initialZones="initialZones"
          :zoned-cluster="zonedCluster"
          :updateOSMaintenance="updateOSMaintenance"
          :is-new="isNewCluster || worker.isNew"
          :max-additional-zones="maxAdditionalZones"
          :kubernetes-version="kubernetesVersion"
          @valid="onWorkerValid"
          @removed-zones="onRemovedZones">
          <template v-slot:action>
            <v-btn v-show="index > 0 || internalWorkers.length > 1"
              size="small"
              variant="outlined"
              icon
              color="grey"
              @click.stop="onRemoveWorker(index)">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </template>
        </worker-input-generic>
      </v-row>
    </v-expand-transition>
    <v-row key="addWorker" class="list-item mb-1 mx-1">
      <v-col>
        <v-btn
          :disabled="!(allMachineTypes.length > 0)"
          size="small"
          @click="addWorker"
          variant="outlined"
          fab
          icon
          class="ml-1"
          color="primary">
          <v-icon class="text-primary">mdi-plus</v-icon>
        </v-btn>
        <v-btn
          :disabled="!(allMachineTypes.length > 0)"
          @click="addWorker"
          variant="text"
          class="text-primary">
          Add Worker Group
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import WorkerInputGeneric from '@/components/ShootWorkers/WorkerInputGeneric.vue'
import { mapGetters } from 'vuex'
import { isZonedCluster } from '@/utils'
import { findFreeNetworks, getZonesNetworkConfiguration } from '@/utils/createShoot'
import forEach from 'lodash/forEach'
import find from 'lodash/find'
import map from 'lodash/map'
import uniq from 'lodash/uniq'
import omit from 'lodash/omit'
import some from 'lodash/some'
import assign from 'lodash/assign'
import isEmpty from 'lodash/isEmpty'
import flatMap from 'lodash/flatMap'
import difference from 'lodash/difference'
import get from 'lodash/get'
import includes from 'lodash/includes'
import filter from 'lodash/filter'
import { v4 as uuidv4 } from '@/utils/uuid'

const NO_LIMIT = -1

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
      originalZonesNetworkConfiguration: undefined,
      zonedCluster: undefined,
      updateOSMaintenance: undefined,
      isNewCluster: false,
      existingWorkerCIDR: undefined,
      kubernetesVersion: undefined,
      initialZones: undefined,
      animateOnAppear: false
    }
  },
  computed: {
    ...mapGetters([
      'machineTypesByCloudProfileName',
      'zonesByCloudProfileNameAndRegion',
      'machineImagesByCloudProfileName',
      'volumeTypesByCloudProfileName',
      'cloudProfileByName',
      'generateWorker',
      'expiringWorkerGroupsForShoot'
    ]),
    allMachineTypes () {
      return this.machineTypesByCloudProfileName({ cloudProfileName: this.cloudProfileName })
    },
    allZones () {
      return this.zonesByCloudProfileNameAndRegion({ cloudProfileName: this.cloudProfileName, region: this.region })
    },
    usedZones () {
      return flatMap(this.internalWorkers, 'zones')
    },
    unusedZones () {
      return difference(this.allZones, this.usedZones)
    },
    currentZonesWithNetworkConfigInShoot () {
      return map(this.currentZonesNetworkConfiguration, 'name')
    },
    currentFreeNetworks () {
      return findFreeNetworks(this.currentZonesNetworkConfiguration, this.existingWorkerCIDR, this.cloudProviderKind, this.allZones.length)
    },
    availableZones () {
      if (!this.zonedCluster) {
        return []
      }
      if (this.isNewCluster) {
        return this.allZones
      }
      // Ensure that only zones can be selected, that have a network config in providerConfig (if required)
      // or that free networks are available to select more zones
      const clusterRequiresZoneNetworkConfiguration = !isEmpty(this.currentZonesWithNetworkConfigInShoot)
      if (!clusterRequiresZoneNetworkConfiguration) {
        return this.allZones
      }

      if (this.currentFreeNetworks.length) {
        return this.allZones
      }

      return this.currentZonesWithNetworkConfigInShoot
    },
    maxAdditionalZones () {
      if (this.isNewCluster) {
        return NO_LIMIT
      }
      const clusterRequiresZoneNetworkConfiguration = !isEmpty(this.currentZonesWithNetworkConfigInShoot)
      if (!clusterRequiresZoneNetworkConfiguration) {
        return NO_LIMIT
      }
      const hasFreeNetworks = this.currentFreeNetworks.length >= this.unusedZones.length
      if (hasFreeNetworks) {
        return NO_LIMIT
      }
      return this.currentFreeNetworks.length
    },
    cloudProviderKind () {
      const cloudProfile = this.cloudProfileByName(this.cloudProfileName)
      return get(cloudProfile, 'metadata.cloudProviderKind')
    },
    currentZonesNetworkConfiguration () {
      return getZonesNetworkConfiguration(this.zonesNetworkConfiguration, this.internalWorkers, this.cloudProviderKind, this.allZones.length, this.existingWorkerCIDR, this.newShootWorkerCIDR)
    },
    expiringWorkerGroups () {
      return this.expiringWorkerGroupsForShoot(this.internalWorkers, this.cloudProfileName, false)
    }
  },
  watch: {
    currentZonesNetworkConfiguration (value) {
      const additionalZonesNetworkConfiguration = filter(this.currentZonesNetworkConfiguration, ({ name }) => {
        return !includes(this.initialZones, name)
      })
      this.$emit('additionalZonesNetworkConfiguration', additionalZonesNetworkConfiguration)
    }
  },
  methods: {
    setInternalWorkers (workers) {
      this.internalWorkers = []
      if (workers) {
        forEach(workers, worker => {
          const id = uuidv4()
          const internalWorker = {
            cri: {},
            machine: {
              architecture: undefined,
              type: undefined,
              image: {
                type: undefined
              }
            },
            volume: {},
            zones: []
          }
          assign(internalWorker, worker, { id })
          this.internalWorkers.push(internalWorker)
        })
      }
      this.validateInput()
    },
    addWorker () {
      // by default propose only zones already used in this cluster
      const availableZones = this.usedZones.length ? this.usedZones : this.availableZones
      const worker = this.generateWorker(availableZones, this.cloudProfileName, this.region, this.kubernetesVersion)
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
    onRemovedZones (removedZones) {
      // when user switches back from yaml tab, networkConfiguration includes any additional networkconfiguration
      // if this additional configuration is no longer needed (zone gets removed), this code takes care to clean
      // it up to avoid creating unnecessary zone network configuration
      forEach(removedZones, removedZone => {
        const networkConfigurationForZoneNotYetCreated = !some(this.originalZonesNetworkConfiguration, { name: removedZone })
        const zoneIsNoLongerUsed = !includes(this.usedZones, removedZone)
        if (networkConfigurationForZoneNotYetCreated && zoneIsNoLongerUsed) {
          this.zonesNetworkConfiguration = filter(this.zonesNetworkConfiguration, ({ name }) => {
            return name !== removedZone
          })
        }
      })
    },
    getWorkers () {
      const workers = map(this.internalWorkers, internalWorker => {
        return omit(internalWorker, ['id', 'valid', 'isNew'])
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
    updateWorkersData ({ workers, zonesNetworkConfiguration }) {
      this.setInternalWorkers(workers)
      this.zonesNetworkConfiguration = zonesNetworkConfiguration
    },
    setWorkersData ({ workers, cloudProfileName, region, zonesNetworkConfiguration, updateOSMaintenance, zonedCluster, existingWorkerCIDR, newShootWorkerCIDR, kubernetesVersion }) {
      this.cloudProfileName = cloudProfileName
      this.region = region
      this.originalZonesNetworkConfiguration = zonesNetworkConfiguration
      this.zonesNetworkConfiguration = zonesNetworkConfiguration
      this.updateOSMaintenance = updateOSMaintenance
      this.setInternalWorkers(workers)
      this.zonedCluster = zonedCluster
      this.isNewCluster = !existingWorkerCIDR
      this.existingWorkerCIDR = existingWorkerCIDR
      this.newShootWorkerCIDR = newShootWorkerCIDR
      this.kubernetesVersion = kubernetesVersion
      this.initialZones = uniq(flatMap(workers, 'zones'))
    }
  },
  mounted () {
    if (this.userInterActionBus) {
      this.userInterActionBus.on('updateCloudProfileName', cloudProfileName => {
        this.internalWorkers = []
        this.cloudProfileName = cloudProfileName
        /*
         * do not pass shootspec as we do not have it available in this component and it is (currently) not required to determine isZoned for new clusters. This event handler is only called for new clusters, as the
         * userInterActionBus is only set for the create cluster use case
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
      this.userInterActionBus.on('updateKubernetesVersion', updatedVersion => {
        this.kubernetesVersion = updatedVersion
      })
    }
  },
  updated () {
    this.animateOnAppear = true
  }
}
</script>
