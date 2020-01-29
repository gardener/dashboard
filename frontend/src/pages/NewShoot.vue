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
  <div class="newshoot-container">
    <v-container fluid class="newshoot-cards">
      <v-card flat>
        <v-card-title class="subheading white--text cyan darken-2 cardTitle">
          Infrastructure
        </v-card-title>
        <v-card-text>
          <new-shoot-select-infrastructure
            ref="infrastructure"
            :userInterActionBus="userInterActionBus"
            @valid="onInfrastructureValid"
            ></new-shoot-select-infrastructure>
        </v-card-text>
      </v-card>
      <v-card flat class="mt-3">
        <v-card-title class="subheading white--text cyan darken-2 cardTitle">
          Cluster Details
        </v-card-title>
        <v-card-text>
          <new-shoot-details
            ref="clusterDetails"
            :userInterActionBus="userInterActionBus"
            @valid="onDetailsValid"
            ></new-shoot-details>
        </v-card-text>
      </v-card>
      <v-card flat class="mt-3">
        <v-card-title class="subheading white--text cyan darken-2 cardTitle">
          Infrastructure Details
        </v-card-title>
        <v-card-text>
          <new-shoot-infrastructure-details
            ref="infrastructureDetails"
            :userInterActionBus="userInterActionBus"
            @valid="onInfrastructureDetailsValid"
            ></new-shoot-infrastructure-details>
        </v-card-text>
      </v-card>
      <v-card flat class="mt-3">
        <v-card-title class="subheading white--text cyan darken-2 cardTitle">
          Worker
        </v-card-title>
        <v-card-text>
          <manage-workers
          ref="manageWorkers"
          :userInterActionBus="userInterActionBus"
          @valid="onWorkersValid"
         ></manage-workers>
       </v-card-text>
      </v-card>
      <v-card flat class="mt-3">
        <v-card-title class="subheading white--text cyan darken-2 cardTitle">
          Add-Ons
        </v-card-title>
        <v-card-text>
          <manage-shoot-addons
            ref="addons"
            :isCreateMode="true"
           ></manage-shoot-addons>
       </v-card-text>
      </v-card>
      <v-card flat class="mt-3">
        <v-card-title class="subheading white--text cyan darken-2 cardTitle">
          Maintenance
        </v-card-title>
        <v-card-text>
          <maintenance-time
            ref="maintenanceTime"
            @valid="onMaintenanceTimeValid"
          ></maintenance-time>
          <maintenance-components
            ref="maintenanceComponents"
            :userInterActionBus="userInterActionBus"
          ></maintenance-components>
       </v-card-text>
      </v-card>
      <v-card flat class="mt-3">
        <v-card-title class="subheading white--text cyan darken-2 cardTitle">
          Hibernation
        </v-card-title>
        <v-card-text>
          <manage-hibernation-schedule
            ref="hibernationSchedule"
            :userInterActionBus="userInterActionBus"
            @valid="onHibernationScheduleValid"
          ></manage-hibernation-schedule>
       </v-card-text>
      </v-card>
      <g-alert ref="errorAlert" color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage" class="error-alert"></g-alert>
    </v-container>
    <v-divider></v-divider>
    <div class="toolbar">
      <v-layout align-center justify-end>
        <v-divider vertical></v-divider>
        <v-btn flat @click.native.stop="createClicked()" :disabled="!valid" class="cyan--text text--darken-2 mr-0">Create</v-btn>
      </v-layout>
    </div>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
  </div>
</template>

<script>

import NewShootSelectInfrastructure from '@/components/NewShoot/NewShootSelectInfrastructure'
import NewShootInfrastructureDetails from '@/components/NewShoot/NewShootInfrastructureDetails'
import NewShootDetails from '@/components/NewShoot/NewShootDetails'
import ManageShootAddons from '@/components/ShootAddons/ManageAddons'
import MaintenanceComponents from '@/components/ShootMaintenance/MaintenanceComponents'
import MaintenanceTime from '@/components/ShootMaintenance/MaintenanceTime'
import ManageHibernationSchedule from '@/components/ShootHibernation/ManageHibernationSchedule'
import ManageWorkers from '@/components/ShootWorkers/ManageWorkers'
import GAlert from '@/components/GAlert'
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import { mapActions, mapGetters, mapState } from 'vuex'
import set from 'lodash/set'
import get from 'lodash/get'
import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import unset from 'lodash/unset'
import { isZonedCluster } from '@/utils'
import { errorDetailsFromError } from '@/utils/error'
import { getSpecTemplate, getZonesNetworkConfiguration, getControlPlaneZone } from '@/utils/createShoot'
const EventEmitter = require('events')

export default {
  name: 'create-cluster',
  components: {
    NewShootSelectInfrastructure,
    NewShootInfrastructureDetails,
    NewShootDetails,
    ManageShootAddons,
    MaintenanceComponents,
    MaintenanceTime,
    ManageHibernationSchedule,
    ManageWorkers,
    GAlert,
    ConfirmDialog
  },
  data () {
    return {
      userInterActionBus: new EventEmitter(),
      infrastructureValid: undefined,
      infrastructureDetailsValid: undefined,
      detailsValid: undefined,
      workersValid: undefined,
      maintenanceTimeValid: undefined,
      hibernationScheduleValid: undefined,
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      isShootCreated: false
    }
  },
  computed: {
    ...mapState([
      'namespace'
    ]),
    ...mapGetters([
      'newShootResource',
      'initialNewShootResource',
      'infrastructureSecretsByCloudProfileName',
      'zonesByCloudProfileNameAndRegion',
      'isKymaFeatureEnabled'
    ]),
    valid () {
      return this.infrastructureValid &&
        this.infrastructureDetailsValid &&
        this.detailsValid &&
        this.workersValid &&
        this.maintenanceTimeValid &&
        this.hibernationScheduleValid
    },
    isShootContentDirty () {
      return !isEqual(this.initialNewShootResource, this.shootResourceFromUIComponents())
    }
  },
  methods: {
    ...mapActions([
      'createShoot',
      'setNewShootResource'
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
    shootResourceFromUIComponents () {
      const shootResource = cloneDeep(this.newShootResource)

      const {
        infrastructureKind,
        cloudProfileName,
        region,
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
        set(shootResource, 'spec', getSpecTemplate(infrastructureKind))
      }
      set(shootResource, 'spec.cloudProfileName', cloudProfileName)
      set(shootResource, 'spec.region', region)
      set(shootResource, 'spec.secretBindingName', get(secret, 'metadata.bindingName'))
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

      const { name, kubernetesVersion, purpose } = this.$refs.clusterDetails.getDetailsData()
      set(shootResource, 'metadata.name', name)
      set(shootResource, 'spec.kubernetes.version', kubernetesVersion)
      set(shootResource, 'metadata.annotations["garden.sapcloud.io/purpose"]', purpose)

      const workers = this.$refs.manageWorkers.getWorkers()
      set(shootResource, 'spec.provider.workers', workers)

      const allZones = this.zonesByCloudProfileNameAndRegion({ cloudProfileName, region })
      const oldZoneConfiguration = get(shootResource, 'spec.provider.infrastructureConfig.networks.zones', undefined)
      const zonesNetworkConfiguration = getZonesNetworkConfiguration(oldZoneConfiguration, workers, infrastructureKind, allZones.length)
      if (zonesNetworkConfiguration) {
        set(shootResource, 'spec.provider.infrastructureConfig.networks.zones', zonesNetworkConfiguration)
      }

      const oldControlPlaneZone = get(shootResource, 'spec.provider.controlPlaneConfig.zone')
      const controlPlaneZone = getControlPlaneZone(workers, infrastructureKind, oldControlPlaneZone)
      if (controlPlaneZone) {
        set(shootResource, 'spec.provider.controlPlaneConfig.zone', controlPlaneZone)
      }

      const addons = this.$refs.addons.getAddons()
      const kymaEnabled = get(addons, 'kyma.enabled', false)
      delete addons.kyma
      set(shootResource, 'spec.addons', addons)
      if (this.isKymaFeatureEnabled) {
        if (kymaEnabled) {
          set(shootResource, 'metadata.annotations["experimental.addons.shoot.gardener.cloud/kyma"]', 'enabled')
        } else {
          unset(shootResource, 'metadata.annotations["experimental.addons.shoot.gardener.cloud/kyma"]')
        }
      }

      const { utcBegin, utcEnd } = this.$refs.maintenanceTime.getUTCMaintenanceWindow()
      const { k8sUpdates, osUpdates } = this.$refs.maintenanceComponents.getComponentUpdates()
      const autoUpdate = get(shootResource, 'spec.maintenance.autoUpdate', {})
      autoUpdate.kubernetesVersion = k8sUpdates
      autoUpdate.machineImageVersion = osUpdates
      const maintenance = {
        timeWindow: {
          begin: utcBegin,
          end: utcEnd
        },
        autoUpdate
      }

      set(shootResource, 'spec.maintenance', maintenance)

      const hibernationSchedule = this.$refs.hibernationSchedule.getScheduleCrontab()
      set(shootResource, 'spec.hibernation.schedules', hibernationSchedule)
      const noHibernationSchedule = this.$refs.hibernationSchedule.getNoHibernationSchedule()
      if (noHibernationSchedule) {
        set(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]', 'true')
      } else {
        unset(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]')
      }

      return shootResource
    },
    updateShootResourceWithUIComponents () {
      const shootResource = this.shootResourceFromUIComponents()
      this.setNewShootResource(shootResource)
      return shootResource
    },
    updateUIComponentsWithShootResource () {
      const shootResource = cloneDeep(this.newShootResource)

      const infrastructureKind = get(shootResource, 'spec.provider.type')
      this.$refs.infrastructure.setSelectedInfrastructure(infrastructureKind)

      const cloudProfileName = get(shootResource, 'spec.cloudProfileName')
      const region = get(shootResource, 'spec.region')
      const secretBindingName = get(shootResource, 'spec.secretBindingName')
      const secret = this.infrastructureSecretsByBindingName({ secretBindingName, cloudProfileName })

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

      const utcBegin = get(shootResource, 'spec.maintenance.timeWindow.begin')
      const k8sUpdates = get(shootResource, 'spec.maintenance.autoUpdate.kubernetesVersion', true)
      const osUpdates = get(shootResource, 'spec.maintenance.autoUpdate.machineImageVersion', true)
      this.$refs.maintenanceTime.setLocalizedTime(utcBegin)
      this.$refs.maintenanceComponents.setComponentUpdates({ k8sUpdates, osUpdates })

      const name = get(shootResource, 'metadata.name')
      const kubernetesVersion = get(shootResource, 'spec.kubernetes.version')
      const purpose = get(shootResource, 'metadata.annotations["garden.sapcloud.io/purpose"]')
      this.purpose = purpose
      this.$refs.clusterDetails.setDetailsData({ name, kubernetesVersion, purpose, secret, cloudProfileName, updateK8sMaintenance: k8sUpdates })

      const workers = get(shootResource, 'spec.provider.workers')
      this.$refs.manageWorkers.setWorkersData({ workers, cloudProfileName, region, updateOSMaintenance: osUpdates, zonedCluster: isZonedCluster({ cloudProviderKind: infrastructureKind }) })

      const addons = cloneDeep(get(shootResource, 'spec.addons', {}))
      if (this.isKymaFeatureEnabled) {
        const kymaEnabled = !!get(shootResource, 'metadata.annotations["experimental.addons.shoot.gardener.cloud/kyma"]')
        addons['kyma'] = { enabled: kymaEnabled }
      }
      this.$refs.addons.updateAddons(addons)

      const hibernationSchedule = get(shootResource, 'spec.hibernation.schedules')
      const noHibernationSchedule = get(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]', false)
      this.$refs.hibernationSchedule.setScheduleData({ hibernationSchedule, noHibernationSchedule, purpose })
    },
    async createClicked () {
      const shootResource = this.updateShootResourceWithUIComponents()

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
        this.errorMessage = `Failed to create cluster.`
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
        confirmButtonText: 'Leave',
        captionText: 'Leave Create Cluster Page?',
        messageHtml: 'Your cluster has not been created.<br/>Do you want to cancel cluster creation and discard your changes?'
      })
    },
    confirmNavigateToYamlIfInvalid () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Continue',
        captionText: 'Validation Errors',
        messageHtml: 'Your cluster has validation errors.<br/>If you navigate to the yaml editor, you may lose data.'
      })
    },
    infrastructureSecretsByBindingName ({ secretBindingName, cloudProfileName }) {
      const secrets = this.infrastructureSecretsByCloudProfileName(cloudProfileName)
      return find(secrets, ['metadata.bindingName', secretBindingName])
    }
  },
  async beforeRouteLeave (to, from, next) {
    if (to.name === 'NewShootEditor') {
      if (!this.valid) {
        if (!await this.confirmNavigateToYamlIfInvalid()) {
          return next(false)
        }
      }
      this.updateShootResourceWithUIComponents()
      return next()
    } else {
      if (!this.isShootCreated && this.isShootContentDirty) {
        if (!await this.confirmNavigation()) {
          return next(false)
        }
      }
      return next()
    }
  },
  mounted () {
    this.updateUIComponentsWithShootResource()
  }
}
</script>

<style lang="styl" scoped>

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
    overflow: scroll;
  }

</style>
