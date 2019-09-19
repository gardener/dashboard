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
  <v-container fluid>
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
    <g-alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></g-alert>
    <v-layout justify-end>
      <v-btn flat @click.native.stop="cancelClicked()">Cancel</v-btn>
      <v-btn flat @click.native.stop="createClicked()" :disabled="!valid" class="cyan--text text--darken-2">Create</v-btn>
    </v-layout>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
  </v-container>
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
import { errorDetailsFromError } from '@/utils/error'
import { getCloudProviderTemplate } from '@/utils/createShoot'
const { getCloudProviderKind } = require('../utils')
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
      'infrastructureSecretsByCloudProfileName'
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

      const { infrastructureKind, cloudProfileName, region, secret, zones, floatingPoolName, loadBalancerProviderName } = this.$refs.infrastructureDetails.getInfrastructureData()
      const secretBindingRef = {
        name: get(secret, 'metadata.bindingName')
      }
      set(shootResource, 'spec.cloud.profile', cloudProfileName)
      set(shootResource, 'spec.cloud.region', region)
      set(shootResource, 'spec.cloud.secretBindingRef', secretBindingRef)
      const oldInfrastructureKind = getCloudProviderKind(get(shootResource, 'spec.cloud'))
      if (oldInfrastructureKind !== infrastructureKind) {
        // Infrastructure changed
        unset(shootResource, ['spec', 'cloud', oldInfrastructureKind])
        set(shootResource, ['spec', 'cloud', infrastructureKind], getCloudProviderTemplate(infrastructureKind))
      }
      if (!isEmpty(floatingPoolName)) {
        set(shootResource, ['spec', 'cloud', infrastructureKind, 'floatingPoolName'], floatingPoolName)
      }
      if (!isEmpty(loadBalancerProviderName)) {
        set(shootResource, ['spec', 'cloud', infrastructureKind, 'loadBalancerProvider'], loadBalancerProviderName)
      }
      if (!isEmpty(zones)) {
        set(shootResource, ['spec', 'cloud', infrastructureKind, 'zones'], zones)
      }

      const { name, kubernetesVersion, purpose } = this.$refs.clusterDetails.getDetailsData()
      set(shootResource, 'metadata.name', name)
      set(shootResource, 'spec.kubernetes.version', kubernetesVersion)
      set(shootResource, 'metadata.annotations["garden.sapcloud.io/purpose"]', purpose)

      const workers = this.$refs.manageWorkers.getWorkers()
      set(shootResource, ['spec', 'cloud', infrastructureKind, 'workers'], workers)

      const addons = this.$refs.addons.getAddons()
      set(shootResource, 'spec.addons', addons)

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
      set(shootResource, 'spec.hibernation.schedule', hibernationSchedule)
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
      const shootResource = this.newShootResource

      const infrastructureKind = getCloudProviderKind(get(shootResource, 'spec.cloud'))
      this.$refs.infrastructure.setSelectedInfrastructure(infrastructureKind)

      const cloudProfileName = get(shootResource, 'spec.cloud.profile')
      const region = get(shootResource, 'spec.cloud.region')
      const secretBindingName = get(shootResource, 'spec.cloud.secretBindingRef.name')
      const secret = this.infrastructureSecretsByBindingName({ secretBindingName, cloudProfileName })

      const zones = get(shootResource, ['spec', 'cloud', infrastructureKind, 'zones'])
      const floatingPoolName = get(shootResource, ['spec', 'cloud', infrastructureKind, 'floatingPoolName'])
      const loadBalancerProviderName = get(shootResource, ['spec', 'cloud', infrastructureKind, 'loadBalancerProvider'])

      this.$refs.infrastructureDetails.setInfrastructureData({ infrastructureKind, cloudProfileName, region, secret, zones, floatingPoolName, loadBalancerProviderName })

      const name = get(shootResource, 'metadata.name')
      const kubernetesVersion = get(shootResource, 'spec.kubernetes.version')
      const purpose = get(shootResource, 'metadata.annotations["garden.sapcloud.io/purpose"]')
      this.purpose = purpose
      this.$refs.clusterDetails.setDetailsData({ name, kubernetesVersion, purpose, secret, cloudProfileName })

      const addons = get(shootResource, 'spec.addons')
      this.$refs.addons.updateAddons(addons)

      const utcBegin = get(shootResource, 'spec.maintenance.timeWindow.begin')
      const k8sUpdates = get(shootResource, 'spec.maintenance.autoUpdate.kubernetesVersion', true)
      const osUpdates = get(shootResource, 'spec.maintenance.autoUpdate.machineImageVersion', true)
      this.$refs.maintenanceTime.setLocalizedTime(utcBegin)
      this.$refs.maintenanceComponents.setComponentUpdates({ k8sUpdates, osUpdates })

      const hibernationSchedule = get(shootResource, 'spec.hibernation.schedule')
      const noHibernationSchedule = get(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]', false)
      this.$refs.hibernationSchedule.setScheduleData({ hibernationSchedule, noHibernationSchedule, purpose })

      const workers = get(shootResource, ['spec', 'cloud', infrastructureKind, 'workers'])
      this.$refs.manageWorkers.setWorkersData({ workers, cloudProfileName, zones })
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
    cancelClicked () {
      this.$router.push({
        name: 'ShootList',
        params: {
          namespace: this.namespace
        }
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

</style>
