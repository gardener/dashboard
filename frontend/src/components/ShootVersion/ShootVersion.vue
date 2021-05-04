<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-tooltip top>
      <template v-slot:activator="{ on: tooltip }">
        <div v-on="tooltip">
          <v-btn
            v-if="chip"
            class="update_btn"
            :class="buttonInactive"
            small
            rounded
            @click="showUpdateDialog"
            :outlined="!k8sPatchAvailable"
            :ripple="canUpdate"
            depressed
            color="primary"
          >
            <v-icon small v-if="availableK8sUpdates">mdi-menu-up</v-icon>
            {{shootK8sVersion}}
          </v-btn>
          <v-btn
            v-else-if="!!availableK8sUpdates"
            @click="showUpdateDialog"
            icon
            :disabled="!canUpdate"
            color="action-button"
          >
            <v-icon v-if="k8sPatchAvailable">mdi-arrow-up-bold-circle</v-icon>
            <v-icon v-else>mdi-arrow-up-bold-circle-outline</v-icon>
          </v-btn>
        </div>
      </template>
      <span>{{tooltipText}}</span>
    </v-tooltip>
    <g-dialog
      :confirm-value="confirm"
      confirm-button-text="Update"
      :confirm-disabled="selectedVersionInvalid"
      :error-message.sync="updateErrorMessage"
      :detailed-error-message.sync="updateDetailedErrorMessage"
      ref="gDialog"
      >
      <template v-slot:caption>Update Cluster</template>
      <template v-slot:affectedObjectName>{{shootName}}</template>
      <template v-slot:message>
        <shoot-version-update
          :available-k8s-updates="availableK8sUpdates"
          :current-k8s-version="kubernetesVersion"
          @selected-version="onSelectedVersion"
          @selected-version-type="onSelectedVersionType"
          @selected-version-invalid="onSelectedVersionInvalid"
          @confirm-required="onConfirmRequired"
          ref="shootVersionUpdate"
        ></shoot-version-update>
        <template v-if="!selectedVersionInvalid && selectedVersionType === 'minor'">
          <p>
            You should always test your scenario and back up all your data before attempting an upgrade. Don’t forget to include the workload inside your cluster!
          </p>
          <p>
            You should consider the
            <a href="https://github.com/kubernetes/kubernetes/releases" target="_blank">
              Kubernetes release notes
              <v-icon style="font-size:80%">mdi-open-in-new</v-icon>
            </a>
            before upgrading your cluster.
          </p>
          <p>
            Type <b>{{shootName}}</b> below and confirm to upgrade the Kubernetes version of your cluster.<br /><br />
          </p>
          <i class="warning--text">This action cannot be undone.</i>
        </template>
        <template v-if="!selectedVersionInvalid && selectedVersionType === 'patch'">
          <p>
            Applying a patch to your cluster will increase the Kubernetes version which can lead to unexpected side effects.
          </p>
          <i class="warning--text">This action cannot be undone.</i>
        </template>
      </template>
    </g-dialog>
  </div>
</template>

<script>
import ShootVersionUpdate from '@/components/ShootVersion/ShootVersionUpdate'
import GDialog from '@/components/dialogs/GDialog'
import { updateShootVersion } from '@/utils/api'
import { availableK8sUpdatesForShoot } from '@/utils'
import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'
import { mapGetters } from 'vuex'
import get from 'lodash/get'
import find from 'lodash/find'

export default {
  components: {
    ShootVersionUpdate,
    GDialog
  },
  props: {
    shootItem: {
      type: Object
    },
    chip: {
      type: Boolean
    }
  },
  data () {
    return {
      selectedVersion: undefined,
      selectedVersionType: undefined,
      selectedVersionInvalid: true,
      confirmRequired: false,
      updateErrorMessage: null,
      updateDetailedErrorMessage: null
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'canPatchShoots',
      'kubernetesVersions'
    ]),
    kubernetesVersion () {
      const version = find(this.kubernetesVersions(this.shootCloudProfileName), { version: this.shootK8sVersion })
      if (!version) {
        return {}
      }
      return version
    },
    k8sPatchAvailable () {
      if (get(this.availableK8sUpdates, 'patch')) {
        return true
      }
      return false
    },
    buttonInactive () {
      return this.canUpdate ? '' : 'update_btn_inactive'
    },
    canUpdate () {
      return !!this.availableK8sUpdates && !this.isShootMarkedForDeletion && !this.isShootActionsDisabledForPurpose && this.canPatchShoots
    },
    confirm () {
      return this.confirmRequired ? this.shootName : undefined
    },
    availableK8sUpdates () {
      return availableK8sUpdatesForShoot(this.shootK8sVersion, this.shootCloudProfileName)
    },
    tooltipText () {
      if (this.k8sPatchAvailable) {
        return this.shootActionToolTip('Kubernetes patch available')
      } else if (this.availableK8sUpdates) {
        return this.shootActionToolTip('Kubernetes upgrade available')
      } else {
        return 'Kubernetes version up to date'
      }
    }
  },
  methods: {
    onSelectedVersion (value) {
      this.selectedVersion = value
    },
    onSelectedVersionType (value) {
      this.selectedVersionType = value
    },
    onSelectedVersionInvalid (value) {
      this.selectedVersionInvalid = value
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
            await updateShootVersion({ namespace: this.shootNamespace, name: this.shootName, data: { version: this.selectedVersion } })
          } catch (err) {
            const errorDetails = errorDetailsFromError(err)
            this.updateErrorMessage = 'Update Kubernetes version failed'
            this.updateDetailedErrorMessage = errorDetails.detailedMessage
            console.error(this.updateErrorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
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
    }
  }
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
