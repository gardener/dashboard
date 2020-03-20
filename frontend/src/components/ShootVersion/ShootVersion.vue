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
  <div>
    <v-tooltip top>
      <v-btn
        v-if="chipStyle"
        slot="activator"
        class="update_btn"
        :class="buttonInactive"
        small
        round
        @click="showUpdateDialog"
        :outline="!k8sPatchAvailable"
        :dark="k8sPatchAvailable"
        :ripple="canUpdate"
        depressed
        color="cyan darken-2"
      >
        <v-icon small v-if="availableK8sUpdates">arrow_drop_up</v-icon>
        {{shootK8sVersion}}
      </v-btn>
      <v-btn
        v-else-if="!!availableK8sUpdates"
        slot="activator"
        @click="showUpdateDialog"
        icon
        :disabled="!canUpdate"
      >
        <v-icon v-if="k8sPatchAvailable">mdi-arrow-up-bold-circle</v-icon>
        <v-icon v-else>mdi-arrow-up-bold-circle-outline</v-icon>
      </v-btn>
      <span>{{tooltipText}}</span>
    </v-tooltip>
    <g-dialog
      :confirmValue="confirm"
      confirmButtonText="Update"
      :confirmDisabled="selectedVersionInvalid"
      :errorMessage.sync="updateErrorMessage"
      :detailedErrorMessage.sync="updateDetailedErrorMessage"
      confirmColor="orange"
      defaultColor="orange"
      ref="gDialog"
      >
      <template slot="caption">Update Cluster</template>
      <template slot="affectedObjectName">{{shootName}}</template>
      <template slot="message">
        <shoot-version-update
          :availableK8sUpdates="availableK8sUpdates"
          :currentk8sVersion="shootK8sVersion"
          @selectedVersion="onSelectedVersion"
          @selectedVersionType="onSelectedVersionType"
          @selectedVersionInvalid="onSelectedVersionInvalid"
          @confirmRequired="onConfirmRequired"
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
          <i class="orange--text text--darken-2">This action cannot be undone.</i>
        </template>
        <template v-if="!selectedVersionInvalid && selectedVersionType === 'patch'">
          <p>
            Applying a patch to your cluster will increase the Kubernetes version which can lead to unexpected side effects.
          </p>
          <i class="orange--text text--darken-2">This action cannot be undone.</i>
        </template>
      </template>
    </g-dialog>
  </div>
</template>

<script>
import ShootVersionUpdate from '@/components/ShootVersion/ShootVersionUpdate'
import GDialog from '@/dialogs/GDialog'
import { updateShootVersion } from '@/utils/api'
import { availableK8sUpdatesForShoot } from '@/utils'
import get from 'lodash/get'
import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'
import { mapGetters } from 'vuex'

export default {
  components: {
    ShootVersionUpdate,
    GDialog
  },
  props: {
    shootItem: {
      type: Object
    },
    chipStyle: {
      type: Boolean,
      default: true
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
      'canPatchShoots'
    ]),
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
      return availableK8sUpdatesForShoot(this.shootSpec)
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

<style lang="styl" scoped>
  .update_btn {
    min-width: 0px;
    margin: 0px;
    padding-left: 8px;
    padding-right: 8px;
  }

  .update_btn >>> i {
    margin-left: -8px;
  }

  .update_btn_inactive {
    cursor: default;
  }

  a {
    text-decoration: none;
  }
</style>
