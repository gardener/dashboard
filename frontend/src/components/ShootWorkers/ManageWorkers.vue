<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="pa-1">
    <v-expansion-panels
      class="pt-2"
      multiple
      v-model="openPanels">
      <v-expansion-panel
        v-for="({ worker, workerData, warning }, index) in workerItems"
        :key="worker.id">
        <v-expansion-panel-header disable-icon-rotate class="pa-1">
          <template v-slot:default="{ open }">
            <div class="d-flex" v-if="!open">
              <v-card outlined class="d-flex flex-column flex-grow-1 ma-1" v-for="({title, icon, items}) in workerData" :key="title">
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
            </div>
            <span v-else class="ml-3">Change configuration of worker group <strong>{{worker.name}}</strong></span>
          </template>
          <template v-slot:actions>
            <div class="d-flex align-center">
              <v-icon
                right
                v-if="warning"
                color="warning"
                size="32"
                class="mr-1">
                  mdi-alert-circle
              </v-icon>
              <v-btn
                small
                outlined
                icon
                color="primary"
                class="mr-1">
                <v-icon>
                  {{ isOpenPanel(index) ? 'mdi-pencil-off' : 'mdi-pencil' }}
                </v-icon>
              </v-btn>
              <v-btn v-show="index > 0 || internalWorkers.length > 1"
                small
                outlined
                icon
                color="grey"
                @click.native.stop="onRemoveWorker(index)">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </template>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <worker-input-generic
            ref="workerInput"
            :worker="worker"
            :workers="internalWorkers"
            :cloud-profile-name="cloudProfileName"
            :region="region"
            :all-zones="allZones"
            :available-zones="availableZones"
            :zoned-cluster="zonedCluster"
            :updateOSMaintenance="updateOSMaintenance"
            :is-new="isNewCluster || worker.isNew"
            :max-additional-zones="maxAdditionalZones"
            :initial-zones="initialZones"
            :kubernetes-version="kubernetesVersion"
            @valid="onWorkerValid"
            @removed-zone="onRemovedZone">
          </worker-input-generic>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-btn
      :disabled="!(allMachineTypes.length > 0)"
      @click="addWorker"
      text
      class="primary--text mt-3">
      <v-icon class="mr-1">
        mdi-plus
      </v-icon>
      Add Worker Group
    </v-btn>
  </div>
</template>

<script>
import WorkerInputGeneric from '@/components/ShootWorkers/WorkerInputGeneric'
import { mapGetters } from 'vuex'
import { isZonedCluster, workerGroupData } from '@/utils'
import { findFreeNetworks, getZonesNetworkConfiguration } from '@/utils/createShoot'
import forEach from 'lodash/forEach'
import find from 'lodash/find'
import map from 'lodash/map'
import uniq from 'lodash/uniq'
import omit from 'lodash/omit'
import assign from 'lodash/assign'
import isEmpty from 'lodash/isEmpty'
import flatMap from 'lodash/flatMap'
import difference from 'lodash/difference'
import get from 'lodash/get'
import includes from 'lodash/includes'
import filter from 'lodash/filter'
import some from 'lodash/some'
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
      zonedCluster: undefined,
      updateOSMaintenance: undefined,
      isNewCluster: false,
      existingWorkerCIDR: undefined,
      kubernetesVersion: undefined,
      initialZones: undefined,
      openPanels: []
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
    unusedZones () {
      const usedZones = flatMap(this.internalWorkers, 'zones')
      return difference(this.allZones, usedZones)
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
    },
    workerItems () {
      return map(this.internalWorkers, worker => {
        return {
          worker,
          workerData: this.workerData(worker),
          warning: some(this.expiringWorkerGroups, ['workerName', worker.name])
        }
      })
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
          const internalWorker = assign({}, worker, { id })
          this.internalWorkers.push(internalWorker)
        })
      }
      this.validateInput()
    },
    addWorker () {
      const worker = this.generateWorker(this.availableZones, this.cloudProfileName, this.region, this.kubernetesVersion)
      this.internalWorkers.push(worker)
      this.openPanels.push(this.internalWorkers.length - 1)
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
    onRemovedZone (removedZone) {
      // remove zone network configuration from zonesNetworkConfiguration array if already included
      // this happens if the user navigated to yaml and back to component view
      this.zonesNetworkConfiguration = filter(this.zonesNetworkConfiguration, ({ name }) => {
        return name !== removedZone
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
      this.zonesNetworkConfiguration = zonesNetworkConfiguration
      this.updateOSMaintenance = updateOSMaintenance
      this.setInternalWorkers(workers)
      this.zonedCluster = zonedCluster
      this.isNewCluster = !existingWorkerCIDR
      this.existingWorkerCIDR = existingWorkerCIDR
      this.newShootWorkerCIDR = newShootWorkerCIDR
      this.kubernetesVersion = kubernetesVersion
      this.initialZones = uniq(flatMap(workers, 'zones'))
      if (this.isNewCluster) {
        this.openPanels = [0]
      }
    },
    workerData (worker) {
      const machineTypes = this.machineTypesByCloudProfileName({ cloudProfileName: this.cloudProfileName })
      let type = get(worker, 'machine.type')
      const machineType = find(machineTypes, ['name', type])

      const machineImages = this.machineImagesByCloudProfileName(this.cloudProfileName)
      const { name, version } = get(worker, 'machine.image', {})
      const machineImage = find(machineImages, { name, version })

      const volumeTypes = this.volumeTypesByCloudProfileName({ cloudProfileName: this.cloudProfileName })
      type = get(worker, 'volume.type')
      const volumeType = find(volumeTypes, ['name', type])

      return workerGroupData(machineType, machineImage, volumeType, worker)
    },
    isOpenPanel (index) {
      return includes(this.openPanels, index)
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
  }
}
</script>
