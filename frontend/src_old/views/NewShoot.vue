<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div v-if="sortedCloudProviderKindList.length" class="newshoot-container">
    <v-container fluid class="newshoot-cards">
      <v-card flat>
        <v-card-title class="text-subtitle-1 toolbar-title--text toolbar-background cardTitle">
          Infrastructure
        </v-card-title>
        <v-card-text>
          <new-shoot-select-infrastructure
            ref="infrastructure"
            :user-inter-action-bus="userInterActionBus"
            @valid="onInfrastructureValid"
            ></new-shoot-select-infrastructure>
        </v-card-text>
      </v-card>
      <v-card flat class="mt-4">
        <v-card-title class="text-subtitle-1 toolbar-title--text toolbar-background cardTitle">
          Cluster Details
        </v-card-title>
        <v-card-text>
          <new-shoot-details
            ref="clusterDetails"
            :user-inter-action-bus="userInterActionBus"
            @valid="onDetailsValid"
            ></new-shoot-details>
        </v-card-text>
      </v-card>
      <v-card flat class="mt-4">
        <v-card-title class="text-subtitle-1 toolbar-title--text toolbar-background cardTitle">
          Infrastructure Details
        </v-card-title>
        <v-card-text>
          <new-shoot-infrastructure-details
            ref="infrastructureDetails"
            :user-inter-action-bus="userInterActionBus"
            @valid="onInfrastructureDetailsValid"
            ></new-shoot-infrastructure-details>
        </v-card-text>
      </v-card>
      <v-card flat class="mt-4">
        <v-card-title class="text-subtitle-1 toolbar-title--text toolbar-background cardTitle">
          Control Plane High Availability
        </v-card-title>
        <v-card-text>
          <manage-control-plane-high-availability />
       </v-card-text>
      </v-card>
      <v-card flat class="mt-4">
        <v-card-title class="text-subtitle-1 toolbar-title--text toolbar-background cardTitle">
          DNS Configuration
        </v-card-title>
        <v-card-text>
          <manage-shoot-dns/>
       </v-card-text>
      </v-card>
      <v-card flat class="mt-4" v-if="cfg.accessRestriction">
        <v-card-title class="text-subtitle-1 toolbar-title--text toolbar-background cardTitle">
         Access Restrictions
        </v-card-title>
        <v-card-text>
          <access-restrictions
            ref="accessRestrictions"
            :user-inter-action-bus="userInterActionBus"
          ></access-restrictions>
        </v-card-text>
      </v-card>
      <v-card flat class="mt-4">
        <v-card-title class="text-subtitle-1 toolbar-title--text toolbar-background cardTitle">
          Worker
        </v-card-title>
        <v-card-text>
          <manage-workers
            :user-inter-action-bus="userInterActionBus"
            @valid="onWorkersValid"
            ref="manageWorkers"
            v-on="$manageWorkers.hooks"
          ></manage-workers>
       </v-card-text>
      </v-card>
      <v-card flat class="mt-4">
        <v-card-title class="text-subtitle-1 toolbar-title--text toolbar-background cardTitle">
          Add-Ons (not actively monitored and provided on a best-effort basis only)
        </v-card-title>
        <v-card-text>
          <manage-shoot-addons
            ref="addons"
            create-mode
           ></manage-shoot-addons>
       </v-card-text>
      </v-card>
      <v-card flat class="mt-4">
        <v-card-title class="text-subtitle-1 toolbar-title--text toolbar-background cardTitle">
          Maintenance
        </v-card-title>
        <v-card-text>
          <maintenance-time
            ref="maintenanceTime"
            @valid="onMaintenanceTimeValid"
          ></maintenance-time>
          <maintenance-components
            ref="maintenanceComponents"
            :user-inter-action-bus="userInterActionBus"
          ></maintenance-components>
       </v-card-text>
      </v-card>
      <v-card flat class="mt-4">
        <v-card-title class="text-subtitle-1 toolbar-title--text toolbar-background cardTitle">
          Hibernation
        </v-card-title>
        <v-card-text>
          <manage-hibernation-schedule
            :user-inter-action-bus="userInterActionBus"
            @valid="onHibernationScheduleValid"
            ref="hibernationSchedule"
            v-on="$hibernationSchedule.hooks"
          ></manage-hibernation-schedule>
       </v-card-text>
      </v-card>
      <g-message ref="errorAlert" color="error" v-model:message="errorMessage" v-model:detailed-message="detailedErrorMessage" class="error-alert"></g-message>
    </v-container>
    <v-divider></v-divider>
    <div class="d-flex align-center justify-end toolbar">
      <v-divider vertical></v-divider>
      <v-btn variant="text" @click.stop="createClicked()" :disabled="!valid" color="primary">Create</v-btn>
    </div>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
  </div>
  <v-alert class="ma-3" type="warning" v-else>
    There must be at least one cloud profile supported by the dashboard as well as a seed that matches it's requirements.
  </v-alert>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'vuex'
import set from 'lodash/set'
import get from 'lodash/get'
import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import unset from 'lodash/unset'

import AccessRestrictions from '@/components/ShootAccessRestrictions/AccessRestrictions.vue'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'
import GMessage from '@/components/GMessage.vue'
import NewShootDetails from '@/components/NewShoot/NewShootDetails.vue'
import NewShootInfrastructureDetails from '@/components/NewShoot/NewShootInfrastructureDetails.vue'
import NewShootSelectInfrastructure from '@/components/NewShoot/NewShootSelectInfrastructure.vue'
import MaintenanceComponents from '@/components/ShootMaintenance/MaintenanceComponents.vue'
import MaintenanceTime from '@/components/ShootMaintenance/MaintenanceTime.vue'
import ManageShootAddons from '@/components/ShootAddons/ManageAddons.vue'
import ManageShootDns from '@/components/ShootDns/ManageDns.vue'
import ManageControlPlaneHighAvailability from '@/components/ControlPlaneHighAvailability/ManageControlPlaneHighAvailability.vue'

import asyncRef from '@/mixins/asyncRef'

import { isZonedCluster } from '@/utils'
import { errorDetailsFromError } from '@/utils/error'
import { getSpecTemplate, getZonesNetworkConfiguration, getControlPlaneZone } from '@/utils/createShoot'

import EventEmitter from 'events'

const ManageHibernationSchedule = () => import('@/components/ShootHibernation/ManageHibernationSchedule.vue')
const ManageWorkers = () => import('@/components/ShootWorkers/ManageWorkers.vue')

export default {
  name: 'create-cluster',
  components: {
    NewShootSelectInfrastructure,
    NewShootInfrastructureDetails,
    AccessRestrictions,
    NewShootDetails,
    ManageShootAddons,
    ManageShootDns,
    MaintenanceComponents,
    MaintenanceTime,
    ManageHibernationSchedule,
    ManageWorkers,
    GMessage,
    ConfirmDialog,
    ManageControlPlaneHighAvailability
  },
  mixins: [
    asyncRef('manageWorkers'),
    asyncRef('hibernationSchedule')
  ],
  data () {
    return {
      userInterActionBus: new EventEmitter(),
      infrastructureValid: false,
      infrastructureDetailsValid: false,
      detailsValid: false,
      workersValid: false,
      maintenanceTimeValid: false,
      hibernationScheduleValid: false,
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      isShootCreated: false
    }
  },
  computed: {
    ...mapState([
      'namespace',
      'cfg'
    ]),
    ...mapState('shootStaging', [
      'controlPlaneFailureToleranceType'
    ]),
    ...mapGetters('shootStaging', [
      'getDnsConfiguration',
      'dnsConfigurationValid'
    ]),
    ...mapGetters([
      'newShootResource',
      'initialNewShootResource',
      'infrastructureSecretsByCloudProfileName',
      'zonesByCloudProfileNameAndRegion',
      'nodesCIDR',
      'sortedCloudProviderKindList'
    ]),
    valid () {
      return this.infrastructureValid &&
        this.infrastructureDetailsValid &&
        this.detailsValid &&
        this.workersValid &&
        this.maintenanceTimeValid &&
        this.hibernationScheduleValid &&
        this.dnsConfigurationValid
    }
  },
  methods: {
    ...mapActions([
      'createShoot',
      'setNewShootResource'
    ]),
    ...mapActions('shootStaging', [
      'setClusterConfiguration'
    ]),
    onInfrastructureValid (value) {
      this.infrastructureValid = value
    },
    onInfrastructureDetailsValid (value) {
      this.infrastructureDetailsValid = value
    },
    onDetailsValid (value) {
      this.detailsValid = value
    },
    onWorkersValid (value) {
      this.workersValid = value
    },
    onMaintenanceTimeValid (value) {
      this.maintenanceTimeValid = value
    },
    onHibernationScheduleValid (value) {
      this.hibernationScheduleValid = value
    },
    async isShootContentDirty () {
      const shootResource = await this.shootResourceFromUIComponents()
      return !isEqual(this.initialNewShootResource, shootResource)
    },
    async shootResourceFromUIComponents () {
      const shootResource = cloneDeep(this.newShootResource)

      const {
        infrastructureKind,
        cloudProfileName,
        region,
        networkingType,
        secret,
        floatingPoolName,
        loadBalancerProviderName,
        loadBalancerClasses,
        partitionID,
        projectID,
        firewallImage,
        firewallSize,
        firewallNetworks
      } = this.$refs.infrastructureDetails.getInfrastructureData()
      const oldInfrastructureKind = get(shootResource, 'spec.provider.type')
      if (oldInfrastructureKind !== infrastructureKind) {
        // Infrastructure changed
        set(shootResource, 'spec', getSpecTemplate(infrastructureKind, this.nodesCIDR))
      }
      set(shootResource, 'spec.cloudProfileName', cloudProfileName)
      set(shootResource, 'spec.region', region)
      set(shootResource, 'spec.networking.type', networkingType)
      set(shootResource, 'spec.secretBindingName', get(secret, 'metadata.name'))
      if (!isEmpty(floatingPoolName)) {
        set(shootResource, 'spec.provider.infrastructureConfig.floatingPoolName', floatingPoolName)
      }
      if (!isEmpty(loadBalancerProviderName)) {
        set(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerProvider', loadBalancerProviderName)
      }
      if (!isEmpty(loadBalancerClasses)) {
        set(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerClasses', loadBalancerClasses)
      }
      if (!isEmpty(partitionID)) {
        set(shootResource, 'spec.provider.infrastructureConfig.partitionID', partitionID)
      }
      if (!isEmpty(projectID)) {
        set(shootResource, 'spec.provider.infrastructureConfig.projectID', projectID)
      }
      if (!isEmpty(firewallImage)) {
        set(shootResource, 'spec.provider.infrastructureConfig.firewall.image', firewallImage)
      }
      if (!isEmpty(firewallSize)) {
        set(shootResource, 'spec.provider.infrastructureConfig.firewall.size', firewallSize)
      }
      if (!isEmpty(firewallNetworks)) {
        set(shootResource, 'spec.provider.infrastructureConfig.firewall.networks', firewallNetworks)
      }

      const dnsConfiguration = this.getDnsConfiguration()
      if (dnsConfiguration.domain || !isEmpty(dnsConfiguration.providers)) {
        set(shootResource, 'spec.dns', dnsConfiguration)
      } else {
        unset(shootResource, 'spec.dns')
      }

      if (this.$refs.accessRestrictions) {
        this.$refs.accessRestrictions.applyTo(shootResource)
      }

      const {
        name,
        kubernetesVersion,
        purpose,
        enableStaticTokenKubeconfig
      } = this.$refs.clusterDetails.getDetailsData()
      set(shootResource, 'metadata.name', name)
      set(shootResource, 'spec.kubernetes.version', kubernetesVersion)
      set(shootResource, 'spec.kubernetes.enableStaticTokenKubeconfig', enableStaticTokenKubeconfig)
      set(shootResource, 'spec.purpose', purpose)

      const workers = await this.$manageWorkers.dispatch('getWorkers')
      set(shootResource, 'spec.provider.workers', workers)

      const allZones = this.zonesByCloudProfileNameAndRegion({ cloudProfileName, region })
      const oldZoneConfiguration = get(shootResource, 'spec.provider.infrastructureConfig.networks.zones', [])
      const nodeCIDR = get(shootResource, 'spec.networking.nodes', this.nodesCIDR)
      const zonesNetworkConfiguration = getZonesNetworkConfiguration(oldZoneConfiguration, workers, infrastructureKind, allZones.length, undefined, nodeCIDR)
      if (zonesNetworkConfiguration) {
        set(shootResource, 'spec.provider.infrastructureConfig.networks.zones', zonesNetworkConfiguration)
      }

      const oldControlPlaneZone = get(shootResource, 'spec.provider.controlPlaneConfig.zone')
      const controlPlaneZone = getControlPlaneZone(workers, infrastructureKind, oldControlPlaneZone)
      if (controlPlaneZone) {
        set(shootResource, 'spec.provider.controlPlaneConfig.zone', controlPlaneZone)
      }

      const addons = this.$refs.addons.getAddons()
      set(shootResource, 'spec.addons', addons)

      const { begin, end } = this.$refs.maintenanceTime.getMaintenanceWindow()
      const { k8sUpdates, osUpdates } = this.$refs.maintenanceComponents.getComponentUpdates()
      const autoUpdate = get(shootResource, 'spec.maintenance.autoUpdate', {})
      autoUpdate.kubernetesVersion = k8sUpdates
      autoUpdate.machineImageVersion = osUpdates
      const maintenance = {
        timeWindow: {
          begin,
          end
        },
        autoUpdate
      }

      set(shootResource, 'spec.maintenance', maintenance)

      const scheduleCrontab = await this.$hibernationSchedule.dispatch('getScheduleCrontab')
      set(shootResource, 'spec.hibernation.schedules', scheduleCrontab)
      const noHibernationSchedule = await this.$hibernationSchedule.dispatch('getNoHibernationSchedule')
      if (noHibernationSchedule) {
        set(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]', 'true')
      } else {
        unset(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]')
      }

      if (this.controlPlaneFailureToleranceType) {
        set(shootResource, 'spec.controlPlane.highAvailability.failureTolerance.type', this.controlPlaneFailureToleranceType)
      } else {
        unset(shootResource, 'spec.controlPlane')
      }

      return shootResource
    },
    async updateShootResourceWithUIComponents () {
      const shootResource = await this.shootResourceFromUIComponents()
      this.setNewShootResource(shootResource)
      return shootResource
    },
    async updateUIComponentsWithShootResource () {
      const shootResource = cloneDeep(this.newShootResource)

      const infrastructureKind = get(shootResource, 'spec.provider.type')
      this.$refs.infrastructure.setSelectedInfrastructure(infrastructureKind)

      const cloudProfileName = get(shootResource, 'spec.cloudProfileName')
      const region = get(shootResource, 'spec.region')
      const networkingType = get(shootResource, 'spec.networking.type')
      const secretBindingName = get(shootResource, 'spec.secretBindingName')
      const secret = this.infrastructureSecretsByName({ secretBindingName, cloudProfileName })

      const floatingPoolName = get(shootResource, 'spec.provider.infrastructureConfig.floatingPoolName')
      const loadBalancerProviderName = get(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerProvider')
      const loadBalancerClasses = get(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerClasses')

      const partitionID = get(shootResource, 'spec.provider.infrastructureConfig.partitionID')
      const projectID = get(shootResource, 'spec.provider.infrastructureConfig.projectID')
      const firewallImage = get(shootResource, 'spec.provider.infrastructureConfig.firewall.image')
      const firewallSize = get(shootResource, 'spec.provider.infrastructureConfig.firewall.size')
      const firewallNetworks = get(shootResource, 'spec.provider.infrastructureConfig.firewall.networks')

      this.$refs.infrastructureDetails.setInfrastructureData({
        infrastructureKind,
        cloudProfileName,
        region,
        networkingType,
        secret,
        floatingPoolName,
        loadBalancerProviderName,
        loadBalancerClasses,
        partitionID,
        projectID,
        firewallImage,
        firewallSize,
        firewallNetworks
      })

      if (this.$refs.accessRestrictions) {
        this.$refs.accessRestrictions.setAccessRestrictions({ shootResource, cloudProfileName, region })
      }

      const begin = get(shootResource, 'spec.maintenance.timeWindow.begin')
      const end = get(shootResource, 'spec.maintenance.timeWindow.end')
      const k8sUpdates = get(shootResource, 'spec.maintenance.autoUpdate.kubernetesVersion', true)
      const osUpdates = get(shootResource, 'spec.maintenance.autoUpdate.machineImageVersion', true)
      this.$refs.maintenanceTime.setBeginTimeTimezoneString(begin)
      this.$refs.maintenanceTime.setEndTimeTimezoneString(end)
      this.$refs.maintenanceComponents.setComponentUpdates({ k8sUpdates, osUpdates })

      const name = get(shootResource, 'metadata.name')
      const kubernetesVersion = get(shootResource, 'spec.kubernetes.version')
      const enableStaticTokenKubeconfig = get(shootResource, 'spec.kubernetes.enableStaticTokenKubeconfig')
      const purpose = get(shootResource, 'spec.purpose')
      this.purpose = purpose
      await this.$refs.clusterDetails.setDetailsData({
        name,
        kubernetesVersion,
        purpose,
        secret,
        cloudProfileName,
        updateK8sMaintenance: k8sUpdates,
        enableStaticTokenKubeconfig
      })

      const workers = get(shootResource, 'spec.provider.workers')
      const zonedCluster = isZonedCluster({ cloudProviderKind: infrastructureKind, isNewCluster: true })

      const newShootWorkerCIDR = get(shootResource, 'spec.networking.nodes', this.nodesCIDR)
      await this.$manageWorkers.dispatch('setWorkersData', { workers, cloudProfileName, region, updateOSMaintenance: osUpdates, zonedCluster, kubernetesVersion, newShootWorkerCIDR })

      const addons = cloneDeep(get(shootResource, 'spec.addons', {}))
      this.$refs.addons.updateAddons(addons)

      const hibernationSchedule = get(shootResource, 'spec.hibernation.schedules')
      const noHibernationSchedule = get(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]', false)

      await this.$hibernationSchedule.dispatch('setScheduleData', { hibernationSchedule, noHibernationSchedule, purpose })
    },
    async createClicked () {
      const shootResource = await this.updateShootResourceWithUIComponents()

      try {
        await this.createShoot(shootResource)
        this.isShootCreated = true
        this.$router.push({
          name: 'ShootItem',
          params: {
            namespace: this.namespace,
            name: shootResource.metadata.name
          }
        })
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        this.errorMessage = 'Failed to create cluster.'
        this.detailedErrorMessage = errorDetails.detailedMessage
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)

        this.$nextTick(() => {
          // Need to wait for the new element to be rendered, before we can scroll it into view
          this.$refs.errorAlert.$el.scrollIntoView()
        })
      }
    },
    confirmNavigation () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        captionText: 'Cancel Cluster Creation?',
        messageHtml: 'Your cluster has not been created.<br/>Do you want to cancel cluster creation and discard your draft?'
      })
    },
    confirmNavigateToYamlIfInvalid () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Continue',
        captionText: 'Validation Errors',
        messageHtml: 'Your cluster has validation errors.<br/>If you navigate to the yaml editor, you may lose data.'
      })
    },
    infrastructureSecretsByName ({ secretBindingName, cloudProfileName }) {
      const secrets = this.infrastructureSecretsByCloudProfileName(cloudProfileName)
      return find(secrets, ['metadata.name', secretBindingName])
    }
  },
  async beforeRouteLeave (to, from, next) {
    if (!this.sortedCloudProviderKindList.length) {
      return next()
    }

    if (to.name === 'NewShootEditor') {
      if (!this.valid && !await this.confirmNavigateToYamlIfInvalid()) {
        return next(false)
      }

      await this.updateShootResourceWithUIComponents()
      return next()
    }

    if (!this.isShootCreated && await this.isShootContentDirty() && !await this.confirmNavigation()) {
      return next(false)
    }

    return next()
  },
  mounted () {
    if (this.sortedCloudProviderKindList.length) {
      this.updateUIComponentsWithShootResource()
    }
  },
  created () {
    if (this.sortedCloudProviderKindList.length) {
      this.setClusterConfiguration(this.newShootResource)
    }
  }
}
</script>

<style lang="scss" scoped>

  .cardTitle {
    line-height: 10px;
  }

  .toolbar {
    height: 48px;
    padding-right: 10px;
  }

  .newshoot-container {
    height: 100%;
    overflow: hidden;
  }

  .newshoot-cards {
    max-height: calc(100% - 48px);
    overflow: auto;
  }

</style>
