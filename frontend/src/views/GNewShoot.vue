<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div
    v-if="sortedProviderTypeList.length"
    class="d-flex flex-column justify-space-between fill-height"
  >
    <v-container
      class="overflow-auto"
      fluid
    >
      <v-card v-if="hideInfrastructure">
        <g-toolbar title="Infrastructure" />
        <v-card-text class="py-1">
          <g-new-shoot-select-infrastructure />
        </v-card-text>
      </v-card>
      <v-card
        class="mt-4"
      >
        <g-toolbar title="Cluster Details" />
        <v-card-text class="py-1">
          <g-new-shoot-details />
        </v-card-text>
      </v-card>
      <v-card class="mt-4">
        <g-toolbar title="Infrastructure Details" />
        <v-card-text class="py-1">
          <g-new-shoot-infrastructure-details />
        </v-card-text>
      </v-card>
      <v-card
        v-if="hideControlPlaneHighAvailability"
        class="mt-4"
      >
        <g-toolbar title="Control Plane High Availability" />
        <v-card-text class="pt-2">
          <g-manage-control-plane-high-availability />
        </v-card-text>
      </v-card>
      <v-card
        v-if="hideDNSConfiguration"
        class="mt-4"
      >
        <g-toolbar title="DNS Configuration" />
        <v-card-text class="py-1">
          <g-manage-dns />
        </v-card-text>
      </v-card>
      <v-card
        v-if="accessRestriction"
        class="mt-4"
      >
        <g-toolbar title="Access Restrictions" />
        <v-card-text class="py-1">
          <g-access-restrictions />
        </v-card-text>
      </v-card>
      <v-card
        v-show="!workerless"
        class="mt-4"
      >
        <g-toolbar
          title="Worker"
        />
        <v-card-text>
          <g-manage-workers />
        </v-card-text>
      </v-card>
      <v-card
        v-show="!workerless"
        v-if="hideAddons"
        class="mt-4"
      >
        <g-toolbar
          title="Add-Ons (not actively monitored and available for clusters with purpose evaluation only)"
        />
        <v-card-text>
          <g-manage-addons create-mode />
        </v-card-text>
      </v-card>
      <v-card class="mt-4">
        <g-toolbar title="Maintenance" />
        <v-card-text>
          <g-maintenance-time />
          <g-maintenance-components
            v-model:auto-update-kubernetes-version="maintenanceAutoUpdateKubernetesVersion"
            v-model:auto-update-machine-image-version="maintenanceAutoUpdateMachineImageVersion"
            :workerless="workerless"
          />
        </v-card-text>
      </v-card>
      <v-card
        v-if="hideHibernation"
        class="mt-4"
      >
        <g-toolbar title="Hibernation" />
        <v-card-text>
          <g-manage-hibernation-schedule />
        </v-card-text>
      </v-card>
    </v-container>
    <div>
      <g-message
        v-if="errorMessage"
        v-model:message="errorMessage"
        v-model:detailed-message="detailedErrorMessage"
        color="error"
        class="ma-0"
        tile
      />
      <v-divider />
      <div class="d-flex align-center justify-end toolbar">
        <v-divider vertical />
        <v-btn
          variant="text"
          color="primary"
          @click.stop="createClicked()"
        >
          Create
        </v-btn>
        <g-confirm-dialog ref="confirmDialog" />
      </div>
    </div>
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

import { useAppStore } from '@/store/app'
import { useConfigStore } from '@/store/config'
import { useCloudProfileStore } from '@/store/cloudProfile'

import GAccessRestrictions from '@/components/ShootAccessRestrictions/GAccessRestrictions'
import GConfirmDialog from '@/components/dialogs/GConfirmDialog'
import GMessage from '@/components/GMessage'
import GNewShootDetails from '@/components/NewShoot/GNewShootDetails'
import GNewShootInfrastructureDetails from '@/components/NewShoot/GNewShootInfrastructureDetails'
import GNewShootSelectInfrastructure from '@/components/NewShoot/GNewShootSelectInfrastructure'
import GMaintenanceComponents from '@/components/ShootMaintenance/GMaintenanceComponents'
import GMaintenanceTime from '@/components/ShootMaintenance/GMaintenanceTime'
import GManageAddons from '@/components/ShootAddons/GManageAddons'
import GManageDns from '@/components/ShootDns/GManageDns'
import GManageControlPlaneHighAvailability from '@/components/ControlPlaneHighAvailability/GManageControlPlaneHighAvailability'
import GToolbar from '@/components/GToolbar.vue'

import { useShootContext } from '@/composables/useShootContext'

import { errorDetailsFromError } from '@/utils/error'
import { messageFromErrors } from '@/utils/validators'

export default {
  components: {
    GNewShootSelectInfrastructure,
    GNewShootInfrastructureDetails,
    GAccessRestrictions,
    GNewShootDetails,
    GManageAddons,
    GManageDns,
    GMaintenanceComponents,
    GMaintenanceTime,
    GManageHibernationSchedule: defineAsyncComponent(() => import('@/components/ShootHibernation/GManageHibernationSchedule')),
    GManageWorkers: defineAsyncComponent(() => import('@/components/ShootWorkers/GManageWorkers')),
    GMessage,
    GConfirmDialog,
    GManageControlPlaneHighAvailability,
    GToolbar,
  },
  inject: ['api', 'logger'],
  async beforeRouteLeave (to, from, next) {
    if (!this.sortedProviderTypeList.length) {
      return next()
    }

    if (to.name === 'NewShootEditor') {
      if (this.v$.$invalid && !await this.confirmNavigateToYamlIfInvalid()) {
        return next(false)
      }
      return next()
    }

    if (!this.isShootCreated && this.isShootDirty && !await this.confirmNavigation()) {
      return next(false)
    }

    return next()
  },
  async beforeRouteUpdate (to, from, next) {
    if (!this.isShootCreated && this.isShootDirty && !await this.confirmNavigation()) {
      return next(false)
    }

    return next()
  },
  setup () {
    const {
      shootNamespace,
      shootName,
      shootManifest,
      isShootDirty,
      workerless,
      maintenanceAutoUpdateKubernetesVersion,
      maintenanceAutoUpdateMachineImageVersion,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      shootNamespace,
      shootName,
      shootManifest,
      isShootDirty,
      workerless,
      maintenanceAutoUpdateKubernetesVersion,
      maintenanceAutoUpdateMachineImageVersion,
    }
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      isShootCreated: false,
    }
  },
  computed: {
    ...mapState(useConfigStore, [
      'accessRestriction',
      'hideInfrastructure',
      'hideControlPlaneHighAvailability',
      'hideDNSConfiguration',
      'hideAddons',
      'hideHibernation',
    ]),
    ...mapState(useCloudProfileStore, [
      'sortedProviderTypeList',
    ]),
  },
  methods: {
    ...mapActions(useAppStore, [
      'setSuccess',
    ]),
    async createClicked () {
      if (this.v$.$invalid) {
        await this.v$.$validate()
        const message = messageFromErrors(this.v$.$errors)
        this.errorMessage = 'There are input errors that you need to resolve'
        this.detailedErrorMessage = message
        return
      }

      try {
        await this.api.createShoot({
          namespace: this.shootNamespace,
          data: this.shootManifest,
        })
        this.setSuccess('Cluster created')
        this.isShootCreated = true
        this.$router.push({
          name: 'ShootItem',
          params: {
            namespace: this.shootNamespace,
            name: this.shootName,
          },
        })
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        this.errorMessage = 'Failed to create cluster.'
        this.detailedErrorMessage = errorDetails.detailedMessage
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
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
  },
}
</script>

<style lang="scss" scoped>
.toolbar {
  height: 48px;
  padding-right: 10px;
}
</style>
