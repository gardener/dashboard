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
        <create-shoot-infrastructure
          ref="infrastructure"
          @updateCloudProfileName="onUpdateCloudProfileName"
          @updateSecret="onUpdateSecret"
          @valid="onInfrastructureValid"
          ></create-shoot-infrastructure>
      </v-card-text>
    </v-card>
    <v-card flat class="mt-3">
      <v-card-title class="subheading white--text cyan darken-2 cardTitle">
        Cluster Details
      </v-card-title>
      <v-card-text>
        <create-shoot-details
          ref="clusterDetails"
          :cloudProfileName="cloudProfileName"
          :secret="secret"
          @updatePurpose="onUpdatePurpose"
          @valid="onDetailsValid"
          ></create-shoot-details>
      </v-card-text>
    </v-card>
    <v-card flat class="mt-3">
      <v-card-title class="subheading white--text cyan darken-2 cardTitle">
        Worker
      </v-card-title>
      <v-card-text>
        <manage-workers
        ref="manageWorkers"
        :cloudProfileName="cloudProfileName"
        @valid="onWorkersValid"
       ></manage-workers>
     </v-card-text>
    </v-card>
    <v-card flat class="mt-3">
      <v-card-title class="subheading white--text cyan darken-2 cardTitle">
        Add-Ons
      </v-card-title>
      <v-card-text>
        <create-shoot-addons
          ref="addons"
         ></create-shoot-addons>
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
        <hibernation-schedule
          ref="hibernationSchedule"
          :purpose="purpose"
          @valid="onHibernationScheduleValid"
        ></hibernation-schedule>
     </v-card-text>
    </v-card>
    <alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></alert>
    <v-layout justify-end>
      <v-btn @click.native.stop="cancelClicked()">Cancel</v-btn>
      <v-btn @click.native.stop="createClicked()" :disabled="!valid" class="cyan--text text--darken-2">Create</v-btn>
    </v-layout>
  </v-container>
</template>

<script>

import CreateShootInfrastructure from '@/components/CreateShootInfrastructure'
import CreateShootDetails from '@/components/CreateShootDetails'
import CreateShootAddons from '@/components/CreateShootAddons'
import MaintenanceComponents from '@/components/MaintenanceComponents'
import MaintenanceTime from '@/components/MaintenanceTime'
import HibernationSchedule from '@/components/HibernationSchedule'
import ManageWorkers from '@/components/ManageWorkers'
import Alert from '@/components/Alert'
import { mapActions, mapGetters } from 'vuex'
import set from 'lodash/set'
import get from 'lodash/get'
import { errorDetailsFromError } from '@/utils/error'
import { getShootResourceSkeleton, getCloudProviderTemplate } from '@/utils/createShoot'
const { getCloudProviderKind } = require('../utils')

export default {
  name: 'create-cluster',
  components: {
    CreateShootInfrastructure,
    CreateShootDetails,
    CreateShootAddons,
    MaintenanceComponents,
    MaintenanceTime,
    HibernationSchedule,
    ManageWorkers,
    Alert
  },
  data () {
    return {
      cloudProfileName: undefined,
      secret: undefined,
      purpose: undefined,
      infrastructureValid: undefined,
      detailsValid: undefined,
      workersValid: undefined,
      maintenanceTimeValid: undefined,
      hibernationScheduleValid: undefined,
      errorMessage: undefined,
      detailedErrorMessage: undefined
    }
  },
  computed: {
    ...mapGetters([
      'getCreateShootResource'
    ]),
    valid () {
      return this.infrastructureValid &&
        this.detailsValid &&
        this.workersValid &&
        this.maintenanceTimeValid &&
        this.hibernationScheduleValid
    }
  },
  methods: {
    ...mapActions([
      'createShoot'
    ]),
    onUpdateCloudProfileName (cloudProfileName) {
      this.cloudProfileName = cloudProfileName
    },
    onUpdateSecret (secret) {
      this.secret = secret
    },
    onUpdatePurpose (purpose) {
      this.purpose = purpose
    },
    onInfrastructureValid (value) {
      this.infrastructureValid = value
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
    updateShootResourceWithUIComponents () {
      // TODO:   floatingPoolName: loadBalancerProviderName
      const shootResource = this.getCreateShootResource
      const { infrastructureKind, cloudProfileName, region, secret, zones } = this.$refs.infrastructure.getInfrastructureData()
      const secretBindingRef = {
        name: get(secret, 'metadata.bindingName')
      }
      set(shootResource, 'spec.cloud.profile', cloudProfileName)
      set(shootResource, 'spec.cloud.region', region)
      set(shootResource, 'spec.cloud.secretBindingRef', secretBindingRef)
      if (getCloudProviderKind(get(shootResource, 'spec.cloud')) !== infrastructureKind) {
        // !Infrastructure changed
        set(shootResource, ['spec.cloud', infrastructureKind], getCloudProviderTemplate(infrastructureKind))
      }
      // TODO: AZURE?
      set(shootResource, ['spec.cloud', infrastructureKind, 'zones'], zones)

      const { name, kubernetesVersion, purpose } = this.$refs.clusterDetails.getDetailsData()
      set(shootResource, 'metadata.name', name)
      set(shootResource, 'spec.kubernetes.version', kubernetesVersion)
      set(shootResource, 'metadata.annotations["garden.sapcloud.io/purpose"]', purpose)

      const workers = this.$refs.manageWorkers.getWorkers()
      set(shootResource, ['spec.cloud', infrastructureKind, 'workers'], workers)

      const addons = this.$refs.addons.getAddons()
      set(shootResource, ['spec.addons'], addons)

      const { utcBegin, utcEnd } = this.$refs.maintenanceTime.getUTCMaintenanceWindow()
      const { k8sUpdates } = this.$refs.maintenanceComponents.getComponentUpdates()
      const maintenance = {
        timeWindow: {
          begin: utcBegin,
          end: utcEnd
        },
        autoUpdate: {
          kubernetesVersion: k8sUpdates
        }
      }
      set(shootResource, ['spec.maintenance'], maintenance)

      const hibernationSchedule = this.$refs.hibernationSchedule.getScheduleCrontab()
      set(shootResource, ['spec.hibernation.schedule'], hibernationSchedule)
      const noHibernationSchedule = this.$refs.hibernationSchedule.getNoHibernationSchedule()
      if(noHibernationSchedule) {
        set(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]', 'true')
      } else {
        delete shootResource.metadata.annotations['dashboard.garden.sapcloud.io/no-hibernation-schedule']
      }
    },
    updateUIComponentsWithShootResource () {
      // TODO:   floatingPoolName: loadBalancerProviderName
      const shootResource = this.getCreateShootResource
      const { infrastructureKind, cloudProfileName, region, secret, zones } = this.$refs.infrastructure.getInfrastructureData()
      const secretBindingRef = {
        name: get(secret, 'metadata.bindingName')
      }
      set(shootResource, 'spec.cloud.profile', cloudProfileName)
      set(shootResource, 'spec.cloud.region', region)
      set(shootResource, 'spec.cloud.secretBindingRef', secretBindingRef)
      if (getCloudProviderKind(get(shootResource, 'spec.cloud')) !== infrastructureKind) {
        // !Infrastructure changed
        set(shootResource, ['spec.cloud', infrastructureKind], getCloudProviderTemplate(infrastructureKind))
      }
      // TODO: AZURE?
      set(shootResource, ['spec.cloud', infrastructureKind, 'zones'], zones)

      const { name, kubernetesVersion, purpose } = this.$refs.clusterDetails.getDetailsData()
      set(shootResource, 'metadata.name', name)
      set(shootResource, 'spec.kubernetes.version', kubernetesVersion)
      set(shootResource, 'metadata.annotations["garden.sapcloud.io/purpose"]', purpose)

      const workers = this.$refs.manageWorkers.getWorkers()
      set(shootResource, ['spec.cloud', infrastructureKind, 'workers'], workers)

      const addons = this.$refs.addons.getAddons()
      set(shootResource, ['spec.addons'], addons)

      const { utcBegin, utcEnd } = this.$refs.maintenanceTime.getUTCMaintenanceWindow()
      const { k8sUpdates } = this.$refs.maintenanceComponents.getComponentUpdates()
      const maintenance = {
        timeWindow: {
          begin: utcBegin,
          end: utcEnd
        },
        autoUpdate: {
          kubernetesVersion: k8sUpdates
        }
      }
      set(shootResource, ['spec.maintenance'], maintenance)

      const hibernationSchedule = this.$refs.hibernationSchedule.getScheduleCrontab()
      set(shootResource, ['spec.hibernation.schedule'], hibernationSchedule)
      const noHibernationSchedule = this.$refs.hibernationSchedule.getNoHibernationSchedule()
      if(noHibernationSchedule) {
        set(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]', 'true')
      } else {
        delete shootResource.metadata.annotations['dashboard.garden.sapcloud.io/no-hibernation-schedule']
      }
    },
    async createClicked () {
      this.updateShootResourceWithUIComponents()

      try {
        console.log(this.getCreateShootResource);
        // await this.createShoot(this.shootResource)
        // TODO: navigate to new shoot
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        this.errorMessage = `Failed to create cluster.`
        this.detailedErrorMessage = errorDetails.detailedMessage
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    cancelClicked () {
      // TODO: Navigate back to shoot list
    }
  }
}
</script>

<style lang="styl" scoped>

  .cardTitle {
    line-height: 10px;
  }

</style>
