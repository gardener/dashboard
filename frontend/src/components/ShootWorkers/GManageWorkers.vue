<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="!workerless"
    class="alternate-row-background"
  >
    <g-expand-transition-group :disabled="disableWorkerAnimation">
      <v-row
        v-for="(worker, index) in internalWorkers"
        :key="worker.id"
        class="list-item pt-2 my-0 mx-1"
      >
        <g-worker-input-generic
          ref="workerInput"
          :worker="worker"
          :workers="internalWorkers"
          :cloud-profile-name="cloudProfileName"
          :region="region"
          :all-zones="allZones"
          :available-zones="availableZones"
          :initial-zones="initialZones"
          :zoned-cluster="zonedCluster"
          :update-o-s-maintenance="updateOSMaintenance"
          :is-new="isNewCluster || worker.isNew"
          :max-additional-zones="maxAdditionalZones"
          :kubernetes-version="kubernetesVersion"
          @removed-zones="onRemovedZones"
        >
          <template #action>
            <v-btn
              v-show="index > 0 || internalWorkers.length > 1"
              size="x-small"
              variant="tonal"
              icon="mdi-close"
              color="grey"
              @click.stop="onRemoveWorker(index)"
            />
          </template>
        </g-worker-input-generic>
      </v-row>
    </g-expand-transition-group>
    <v-row
      key="addWorker"
      class="list-item mb-1 mx-1"
    >
      <v-col>
        <v-btn
          :disabled="!(allMachineTypes.length > 0)"
          variant="text"
          color="primary"
          @click="addWorker"
        >
          <v-icon class="text-primary">
            mdi-plus
          </v-icon>
          <span class="ml-2">Add Worker Group</span>
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import {
  mapActions,
  mapState,
} from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useConfigStore } from '@/store/config'
import { useShootStagingStore } from '@/store/shootStaging'

import GWorkerInputGeneric from '@/components/ShootWorkers/GWorkerInputGeneric'
import GExpandTransitionGroup from '@/components/GExpandTransitionGroup'

import { isZonedCluster } from '@/utils'
import {
  findFreeNetworks,
  getZonesNetworkConfiguration,
} from '@/utils/createShoot'
import { v4 as uuidv4 } from '@/utils/uuid'

import {
  forEach,
  map,
  uniq,
  omit,
  some,
  assign,
  isEmpty,
  flatMap,
  difference,
  get,
  includes,
  filter,
} from '@/lodash'

const NO_LIMIT = -1

export default {
  components: {
    GWorkerInputGeneric,
    GExpandTransitionGroup,
  },
  props: {
    userInterActionBus: {
      type: Object,
    },
    disableWorkerAnimation: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'additionalZonesNetworkConfiguration',
  ],
  data () {
    return {
      internalWorkers: undefined,
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
    }
  },
  computed: {
    ...mapState(useConfigStore, [
      'customCloudProviders',
    ]),
    ...mapState(useShootStagingStore, [
      'workerless',
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
    },
  },
  watch: {
    currentZonesNetworkConfiguration (value) {
      const additionalZonesNetworkConfiguration = filter(this.currentZonesNetworkConfiguration, ({ name }) => {
        return !includes(this.initialZones, name)
      })
      this.$emit('additionalZonesNetworkConfiguration', additionalZonesNetworkConfiguration)
    },
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
        this.zonedCluster = isZonedCluster({
          cloudProviderKind: this.cloudProviderKind,
          isNewCluster: this.isNewCluster,
          customCloudProviders: this.customCloudProviders,
        })
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
  methods: {
    ...mapActions(useCloudProfileStore, [
      'machineTypesByCloudProfileName',
      'zonesByCloudProfileNameAndRegion',
      'machineImagesByCloudProfileName',
      'volumeTypesByCloudProfileName',
      'cloudProfileByName',
      'generateWorker',
      'expiringWorkerGroupsForShoot',
    ]),
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
                type: undefined,
              },
            },
            volume: {},
            zones: [],
          }
          assign(internalWorker, worker, { id })
          this.internalWorkers.push(internalWorker)
        })
      }
    },
    addWorker () {
      // by default propose only zones already used in this cluster
      const availableZones = this.usedZones.length ? this.usedZones : this.availableZones
      const worker = this.generateWorker(availableZones, this.cloudProfileName, this.region, this.kubernetesVersion)
      this.internalWorkers.push(worker)
    },
    onRemoveWorker (index) {
      this.internalWorkers.splice(index, 1)
    },
    setDefaultWorker () {
      this.internalWorkers = []
      this.addWorker()
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
        return omit(internalWorker, ['id', 'isNew'])
      })
      return workers
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
    },
  },
}
</script>
