<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-tooltip location="top">
      <template #activator="{ props }">
        <div v-bind="props">
          <v-btn
            v-if="chip"
            size="small"
            rounded
            :variant="!supportedPatchAvailable ? 'tonal' : 'flat'"
            :ripple="canUpdate"
            :color="chipColor"
            class="update_btn"
            :class="{ 'update_btn_inactive': !canUpdate }"
            @click="showUpdateDialog"
          >
            <v-icon
              v-if="supportedPatchAvailable || supportedUpgradeAvailable"
              icon="mdi-menu-up"
              size="small"
            />
            {{ shootK8sVersion }}
          </v-btn>
          <g-action-button
            v-else-if="canUpdate"
            :icon="supportedPatchAvailable ? 'mdi-arrow-up-bold-circle' : 'mdi-arrow-up-bold-circle-outline'"
            @click="showUpdateDialog"
          />
        </div>
      </template>
      <span>{{ tooltipText }}</span>
    </v-tooltip>
    <g-dialog
      ref="gDialog"
      v-model:error-message="updateErrorMessage"
      v-model:detailed-error-message="updateDetailedErrorMessage"
      :confirm-value="confirm"
      confirm-button-text="Update"
      width="450"
    >
      <template #caption>
        Update Cluster
      </template>
      <template #affectedObjectName>
        {{ shootName }}
      </template>
      <template #content>
        <v-card-text>
          <g-shoot-version-update
            ref="shootVersionUpdate"
            :available-k8s-updates="availableK8sUpdates"
            :current-k8s-version="kubernetesVersion"
            @selected-version="onSelectedVersion"
            @selected-version-type="onSelectedVersionType"
            @confirm-required="onConfirmRequired"
          />
          <template v-if="!v$.$invalid && selectedVersionType === 'minor'">
            <div class="my-2">
              You should always test your scenario and back up all your data before attempting an upgrade. Don’t forget to include the workload inside your cluster!
            </div>
            <div class="my-2">
              You should consider the
              <a
                href="https://github.com/kubernetes/kubernetes/releases"
                target="_blank"
                rel="noopener"
                class="text-anchor"
              >
                Kubernetes release notes
                <v-icon style="font-size:80%">mdi-open-in-new</v-icon>
              </a>
              before upgrading your cluster.
            </div>
            <div class="my-2">
              Type <strong>{{ shootName }}</strong> below and confirm to upgrade the Kubernetes version of your cluster.
            </div>
            <div class="my-2 font-weight-bold">
              This action cannot be undone.
            </div>
          </template>
          <template v-if="!v$.$invalid && selectedVersionType === 'patch'">
            <div class="my-2">
              Applying a patch to your cluster will increase the Kubernetes version which can lead to unexpected side effects.
            </div>
            <div class="my-2 font-weight-bold">
              This action cannot be undone.
            </div>
          </template>
        </v-card-text>
      </template>
    </g-dialog>
  </div>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'
import { useVuelidate } from '@vuelidate/core'

import { useAuthzStore } from '@/store/authz'
import { useCloudProfileStore } from '@/store/cloudProfile'

import GShootVersionUpdate from '@/components/ShootVersion/GShootVersionUpdate.vue'
import GDialog from '@/components/dialogs/GDialog.vue'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

import { find } from '@/lodash'

export default {
  components: {
    GShootVersionUpdate,
    GDialog,
  },
  inject: ['api', 'logger'],
  props: {
    chip: {
      type: Boolean,
    },
  },
  setup () {
    return {
      v$: useVuelidate(),
      ...useShootItem(),
    }
  },
  data () {
    return {
      selectedVersion: undefined,
      selectedVersionType: undefined,
      confirmRequired: false,
      updateErrorMessage: null,
      updateDetailedErrorMessage: null,
    }
  },
  computed: {
    ...mapState(useAuthzStore, [
      'canPatchShoots',
    ]),
    kubernetesVersion () {
      const version = find(this.kubernetesVersions(this.shootCloudProfileName), { version: this.shootK8sVersion })
      if (!version) {
        return {}
      }
      return version
    },
    supportedPatchAvailable () {
      return !!find(this.availableK8sUpdates?.patch, 'isSupported')
    },
    supportedUpgradeAvailable () {
      return !!find(this.availableK8sUpdates?.minor, 'isSupported')
    },
    canUpdate () {
      return !!this.availableK8sUpdates && !this.isShootMarkedForDeletion && !this.isShootActionsDisabledForPurpose && this.canPatchShoots
    },
    confirm () {
      return this.confirmRequired ? this.shootName : undefined
    },
    availableK8sUpdates () {
      return this.availableKubernetesUpdatesForShoot(this.shootK8sVersion, this.shootCloudProfileName)
    },
    tooltipText () {
      if (this.kubernetesVersion.isDeprecated) {
        return this.shootActionToolTip('Kubernetes version is deprecated')
      }
      if (this.supportedPatchAvailable) {
        return this.shootActionToolTip('Kubernetes patch available')
      }
      if (this.supportedUpgradeAvailable) {
        return this.shootActionToolTip('Kubernetes upgrade available')
      }
      if (this.availableK8sUpdates) {
        return this.shootActionToolTip('Updates available')
      }
      return 'Kubernetes version up to date'
    },
    chipColor () {
      return this.kubernetesVersion.isDeprecated ? 'warning' : 'primary'
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'kubernetesVersions',
      'availableKubernetesUpdatesForShoot',
    ]),
    onSelectedVersion (value) {
      this.selectedVersion = value
    },
    onSelectedVersionType (value) {
      this.selectedVersionType = value
    },
    onConfirmRequired (value) {
      this.confirmRequired = value
    },
    async showUpdateDialog (reset = true) {
      if (this.canUpdate) {
        this.$refs.gDialog.showDialog()
        if (reset) {
          this.$nextTick(() => {
            // need to defer event until dialog has been rendered
            this.reset()
          })
        }

        const confirmed = await this.$refs.gDialog.confirmWithDialog()
        if (confirmed) {
          try {
            await this.api.updateShootVersion({ namespace: this.shootNamespace, name: this.shootName, data: { version: this.selectedVersion } })
          } catch (err) {
            const errorDetails = errorDetailsFromError(err)
            this.updateErrorMessage = 'Update Kubernetes version failed'
            this.updateDetailedErrorMessage = errorDetails.detailedMessage
            this.logger.error(this.updateErrorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
            this.showUpdateDialog(false)
          }
        }
      }
    },
    reset () {
      const defaultData = this.$options.data.apply(this)
      Object.assign(this.$data, defaultData)

      this.updateErrorMessage = undefined
      this.updateDetailedErrorMessage = undefined

      this.$refs.shootVersionUpdate.reset()
    },
    shootActionToolTip (tooltip, overrideDeletionFlag) {
      if (this.isShootActionsDisabledForPurpose) {
        return 'Version update disabled for clusters with purpose "infrastructure"'
      }

      if (this.isShootMarkedForDeletion) {
        return 'Version update disabled for clusters that are marked for deletion'
      }

      return tooltip
    },
  },
}
</script>

<style lang="scss" scoped>
  .update_btn {
    padding-left: 2px !important;
    padding-right: 4px !important;
  }

  .update_btn_inactive {
    cursor: default !important;
  }

  a {
    text-decoration: none;
  }
</style>
