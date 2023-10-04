<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div
    v-if="sortedInfrastructureKindList.length"
    class="newshoot-container"
  >
    <v-container
      fluid
      class="newshoot-cards"
    >
      <v-card flat>
        <g-toolbar title="Infrastructure" />
        <v-card-text class="pt-1">
          <g-new-shoot-select-infrastructure
            ref="infrastructure"
            :user-inter-action-bus="userInterActionBus"
          />
        </v-card-text>
      </v-card>
      <v-card
        flat
        class="mt-4"
      >
        <g-toolbar title="Cluster Details" />
        <v-card-text class="pt-1">
          <g-new-shoot-details
            ref="clusterDetails"
            :user-inter-action-bus="userInterActionBus"
          />
        </v-card-text>
      </v-card>
      <v-card
        flat
        class="mt-4"
      >
        <g-toolbar title="Infrastructure Details" />
        <v-card-text class="pt-1">
          <g-new-shoot-infrastructure-details
            ref="infrastructureDetails"
            :user-inter-action-bus="userInterActionBus"
          />
        </v-card-text>
      </v-card>
      <v-card
        flat
        class="mt-4"
      >
        <g-toolbar title="Control Plane High Availability" />
        <v-card-text class="pt-2">
          <g-manage-control-plane-high-availability />
        </v-card-text>
      </v-card>
      <v-card
        flat
        class="mt-4"
      >
        <g-toolbar title="DNS Configuration" />
        <v-card-text class="pt-1">
          <g-manage-shoot-dns />
        </v-card-text>
      </v-card>
      <v-card
        v-if="accessRestriction"
        flat
        class="mt-4"
      >
        <g-toolbar title="Access Restrictions" />
        <v-card-text class="pt-1">
          <g-access-restrictions
            ref="accessRestrictions"
            :user-inter-action-bus="userInterActionBus"
          />
        </v-card-text>
      </v-card>
      <v-card
        v-show="!workerless"
        flat
        class="mt-4"
      >
        <g-toolbar
          title="Worker"
        />
        <v-card-text class="pt-1">
          <g-manage-workers
            ref="manageWorkersRef"
            :user-inter-action-bus="userInterActionBus"
          />
        </v-card-text>
      </v-card>
      <v-card
        v-show="!workerless"
        flat
        class="mt-4"
      >
        <g-toolbar
          title="Add-Ons (not actively monitored and provided on a best-effort basis only)"
        />
        <v-card-text>
          <g-manage-shoot-addons
            ref="addons"
            create-mode
          />
        </v-card-text>
      </v-card>
      <v-card
        flat
        class="mt-4"
      >
        <g-toolbar title="Maintenance" />
        <v-card-text class="pt-1">
          <g-maintenance-time
            ref="maintenanceTime"
          />
          <g-maintenance-components
            ref="maintenanceComponents"
            :user-inter-action-bus="userInterActionBus"
            :hide-os-updates="workerless"
          />
        </v-card-text>
      </v-card>
      <v-card
        flat
        class="mt-4"
      >
        <g-toolbar title="Hibernation" />
        <v-card-text class="pt-1">
          <g-manage-hibernation-schedule
            ref="hibernationScheduleRef"
            :user-inter-action-bus="userInterActionBus"
          />
        </v-card-text>
      </v-card>
      <g-message
        ref="errorAlert"
        v-model:message="errorMessage"
        v-model:detailed-message="detailedErrorMessage"
        color="error"
        class="error-alert"
      />
    </v-container>
    <v-divider />
    <div class="d-flex align-center justify-end toolbar">
      <v-divider vertical />
      <v-btn
        variant="text"
        :disabled="v$.$invalid"
        color="primary"
        @click.stop="createClicked()"
      >
        Create
      </v-btn>
    </div>
    <g-confirm-dialog ref="confirmDialog" />
  </div>
  <v-alert
    v-else
    class="ma-3"
    type="warning"
  >
    There must be at least one cloud profile supported by the dashboard as well as a seed that matches it's requirements.
  </v-alert>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import {
  mapActions,
  mapState,
} from 'pinia'
import mitt from 'mitt'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useShootStagingStore } from '@/store/shootStaging'
import { useShootStore } from '@/store/shoot'
import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useSecretStore } from '@/store/secret'

import GAccessRestrictions from '@/components/ShootAccessRestrictions/GAccessRestrictions'
import GConfirmDialog from '@/components/dialogs/GConfirmDialog'
import GMessage from '@/components/GMessage'
import GNewShootDetails from '@/components/NewShoot/GNewShootDetails'
import GNewShootInfrastructureDetails from '@/components/NewShoot/GNewShootInfrastructureDetails'
import GNewShootSelectInfrastructure from '@/components/NewShoot/GNewShootSelectInfrastructure'
import GMaintenanceComponents from '@/components/ShootMaintenance/GMaintenanceComponents'
import GMaintenanceTime from '@/components/ShootMaintenance/GMaintenanceTime'
import GManageShootAddons from '@/components/ShootAddons/GManageAddons'
import GManageShootDns from '@/components/ShootDns/GManageDns'
import GManageControlPlaneHighAvailability from '@/components/ControlPlaneHighAvailability/GManageControlPlaneHighAvailability'
import GToolbar from '@/components/GToolbar.vue'

import { useAsyncRef } from '@/composables/useAsyncRef'

import { isZonedCluster } from '@/utils'
import { errorDetailsFromError } from '@/utils/error'
import {
  getSpecTemplate,
  getZonesNetworkConfiguration,
  getControlPlaneZone,
} from '@/utils/createShoot'

import {
  set,
  get,
  find,
  isEmpty,
  cloneDeep,
  isEqual,
  unset,
  omit,
  assign,
} from '@/lodash'

export default {
  components: {
    GNewShootSelectInfrastructure,
    GNewShootInfrastructureDetails,
    GAccessRestrictions,
    GNewShootDetails,
    GManageShootAddons,
    GManageShootDns,
    GMaintenanceComponents,
    GMaintenanceTime,
    GManageHibernationSchedule: defineAsyncComponent(() => import('@/components/ShootHibernation/GManageHibernationSchedule')),
    GManageWorkers: defineAsyncComponent(() => import('@/components/ShootWorkers/GManageWorkers')),
    GMessage,
    GConfirmDialog,
    GManageControlPlaneHighAvailability,
    GToolbar,
  },
  inject: ['logger'],
  async beforeRouteLeave (to, from, next) {
    if (!this.sortedInfrastructureKindList.length) {
      return next()
    }

    if (to.name === 'NewShootEditor') {
      if (this.v$.$invalid && !await this.confirmNavigateToYamlIfInvalid()) {
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
  setup () {
    return {
      ...useAsyncRef('manageWorkers'),
      ...useAsyncRef('hibernationSchedule'),
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      isShootCreated: false,
      userInterActionBus: mitt(),
    }
  },
  computed: {
    ...mapState(useAuthzStore, ['namespace']),
    ...mapState(useConfigStore, ['accessRestriction']),
    ...mapState(useShootStagingStore, ['controlPlaneFailureToleranceType']),
    ...mapState(useShootStagingStore, [
      'workerless',
    ]),
    ...mapState(useShootStore, [
      'newShootResource',
      'initialNewShootResource',
    ]),
    ...mapState(useSecretStore, [
      'sortedInfrastructureKindList',
    ]),
    ...mapState(useCloudProfileStore, [
      'sortedInfrastructureKindList',
    ]),
  },
  mounted () {
    if (this.sortedInfrastructureKindList.length) {
      this.updateUIComponentsWithShootResource()
    }
  },
  created () {
    if (this.sortedInfrastructureKindList.length) {
      this.setClusterConfiguration(this.newShootResource)
    }
  },
  watch: {
    async workerless(value) {
      if(!value) {
        const shootResource = cloneDeep(this.newShootResource)
        const cloudProfileName = shootResource.spec.cloudProfileName
        const infrastructureKind = shootResource.spec.provider.type
        const defaultNodesCIDR = this.getDefaultNodesCIDR({ cloudProfileName })
        assign(shootResource.spec, getSpecTemplate(infrastructureKind, defaultNodesCIDR))
        this.setNewShootResource(shootResource)
      }
    }
  },
  methods: {
    ...mapActions(useShootStore, [
      'createShoot',
      'setNewShootResource',
    ]),
    ...mapActions(useShootStagingStore, [
      'getDnsConfiguration',
      'setClusterConfiguration',
    ]),
    ...mapActions(useSecretStore, [
      'infrastructureSecretsByCloudProfileName',
    ]),
    ...mapActions(useCloudProfileStore, [
      'zonesByCloudProfileNameAndRegion',
      'getDefaultNodesCIDR',
    ]),
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
        firewallNetworks,
        defaultNodesCIDR,
      } = this.$refs.infrastructureDetails.getInfrastructureData()
      const oldInfrastructureKind = get(shootResource, 'spec.provider.type')
      if (oldInfrastructureKind !== infrastructureKind) {
        // Infrastructure changed
        set(shootResource, 'spec', getSpecTemplate(infrastructureKind, defaultNodesCIDR))
      }
      set(shootResource, 'spec.cloudProfileName', cloudProfileName)
      set(shootResource, 'spec.region', region)

      if (!this.workerless) {
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
        enableStaticTokenKubeconfig,
      } = this.$refs.clusterDetails.getDetailsData()
      set(shootResource, 'metadata.name', name)
      set(shootResource, 'spec.kubernetes.version', kubernetesVersion)
      set(shootResource, 'spec.kubernetes.enableStaticTokenKubeconfig', enableStaticTokenKubeconfig)
      set(shootResource, 'spec.purpose', purpose)

      if (!this.workerless) {
        const workers = await this.manageWorkers.dispatch('getWorkers')
        set(shootResource, 'spec.provider.workers', workers)

        const allZones = this.zonesByCloudProfileNameAndRegion({ cloudProfileName, region })
        const oldZoneConfiguration = get(shootResource, 'spec.provider.infrastructureConfig.networks.zones', [])
        const nodeCIDR = get(shootResource, 'spec.networking.nodes', defaultNodesCIDR)
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
      }

      const { begin, end } = this.$refs.maintenanceTime.getMaintenanceWindow()
      const { k8sUpdates, osUpdates } = this.$refs.maintenanceComponents.getComponentUpdates()
      const autoUpdate = get(shootResource, 'spec.maintenance.autoUpdate', {})
      autoUpdate.kubernetesVersion = k8sUpdates
      if (!this.workerless) {
        autoUpdate.machineImageVersion = osUpdates
      }
      const maintenance = {
        timeWindow: {
          begin,
          end,
        },
        autoUpdate,
      }

      set(shootResource, 'spec.maintenance', maintenance)

      const scheduleCrontab = await this.hibernationSchedule.dispatch('getScheduleCrontab')
      set(shootResource, 'spec.hibernation.schedules', scheduleCrontab)
      const noHibernationSchedule = await this.hibernationSchedule.dispatch('getNoHibernationSchedule')
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

      if (this.workerless) {
        return omit(shootResource, [
          'spec.provider.infrastructureConfig',
          'spec.provider.controlPlaneConfig',
          'spec.provider.workers',
          'spec.addons',
          'spec.networking',
          'spec.secretBindingName',
          'spec.maintenance.autoUpdate.machineImageVersion'])
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
        firewallNetworks,
      })

      if (this.$refs.accessRestrictions) {
        this.$refs.accessRestrictions.setAccessRestrictions({ shootResource, cloudProfileName, region })
      }

      const begin = get(shootResource, 'spec.maintenance.timeWindow.begin')
      const end = get(shootResource, 'spec.maintenance.timeWindow.end')
      const k8sUpdates = get(shootResource, 'spec.maintenance.autoUpdate.kubernetesVersion', true)
      const osUpdates = get(shootResource, 'spec.maintenance.autoUpdate.machineImageVersion', true)
      this.$refs.maintenanceTime.setMaintenanceWindow(begin, end)
      this.$refs.maintenanceComponents.setComponentUpdates({ k8sUpdates, osUpdates })

      const name = get(shootResource, 'metadata.name')
      const kubernetesVersion = get(shootResource, 'spec.kubernetes.version')
      const enableStaticTokenKubeconfig = get(shootResource, 'spec.kubernetes.enableStaticTokenKubeconfig')
      const purpose = get(shootResource, 'spec.purpose')
      this.purpose = purpose
      const workers = get(shootResource, 'spec.provider.workers')
      await this.$refs.clusterDetails.setDetailsData({
        name,
        kubernetesVersion,
        purpose,
        secret,
        cloudProfileName,
        updateK8sMaintenance: k8sUpdates,
        enableStaticTokenKubeconfig,
      })

      const zonedCluster = isZonedCluster({ cloudProviderKind: infrastructureKind, isNewCluster: true })

      const defaultNodesCIDR = this.getDefaultNodesCIDR({ cloudProfileName })
      const newShootWorkerCIDR = get(shootResource, 'spec.networking.nodes', defaultNodesCIDR)
      await this.manageWorkers.dispatch('setWorkersData', { workers, cloudProfileName, region, updateOSMaintenance: osUpdates, zonedCluster, kubernetesVersion, newShootWorkerCIDR })

      const addons = cloneDeep(get(shootResource, 'spec.addons', {}))
      this.$refs.addons.updateAddons(addons)

      const hibernationSchedule = get(shootResource, 'spec.hibernation.schedules')
      const noHibernationSchedule = get(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]', false)

      await this.hibernationSchedule.dispatch('setScheduleData', { hibernationSchedule, noHibernationSchedule, purpose })
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
            name: shootResource.metadata.name,
          },
        })
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        this.errorMessage = 'Failed to create cluster.'
        this.detailedErrorMessage = errorDetails.detailedMessage
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)

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
        messageHtml: 'Your cluster has not been created.<br/>Do you want to cancel cluster creation and discard your draft?',
      })
    },
    confirmNavigateToYamlIfInvalid () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Continue',
        captionText: 'Validation Errors',
        messageHtml: 'Your cluster has validation errors.<br/>If you navigate to the yaml editor, you may lose data.',
      })
    },
    infrastructureSecretsByName ({ secretBindingName, cloudProfileName }) {
      const secrets = this.infrastructureSecretsByCloudProfileName(cloudProfileName)
      return find(secrets, ['metadata.name', secretBindingName])
    },
  },
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
