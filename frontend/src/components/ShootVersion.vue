<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
        {{k8sVersion}}
      </v-btn>
      <v-btn
        v-else-if="!!availableK8sUpdates"
        slot="activator"
        @click="showUpdateDialog"
        icon
        :disabled="isShootMarkedForDeletion"
      >
        <v-icon v-if="k8sPatchAvailable">mdi-arrow-up-bold-circle</v-icon>
        <v-icon v-else>mdi-arrow-up-bold-circle-outline</v-icon>
      </v-btn>
      <span>{{tooltipText}}</span>
    </v-tooltip>
    <confirm-dialog
      :confirm="confirm"
      confirmButtonText="Update"
      v-model="updateDialog"
      :cancel="hideUpdateDialog"
      :ok="versionUpdateConfirmed"
      :confirmDisabled="selectedVersionInvalid"
      :errorMessage.sync="updateErrorMessage"
      :detailedErrorMessage.sync="updateDetailedErrorMessage"
      confirmColor="orange"
      defaultColor="orange"
      >
      <template slot="caption">Update Cluster</template>
      <template slot="affectedObjectName">{{shootName}}</template>
      <template slot="message">
        <shoot-version-update
          :availableK8sUpdates="availableK8sUpdates"
          :currentk8sVersion="k8sVersion"
          @selectedVersion="onSelectedVersion"
          @selectedVersionType="onSelectedVersionType"
          @selectedVersionInvalid="onSelectedVersionInvalid"
          @confirmRequired="onConfirmRequired"
          ref="shootVersionUpdate"
        ></shoot-version-update>
        <template v-if="!selectedVersionInvalid && selectedVersionType === 'minor'">
          You should always test your scenario and back up all your data before attempting an upgrade. Don’t forget to include the workload inside your cluster!<br /><br />
          Type <b>{{shootName}}</b> below and confirm to upgrade the Kubernetes version of your cluster.<br /><br />
          <i class="orange--text text--darken-2">This action cannot be undone.</i>
        </template>
        <template v-if="!selectedVersionInvalid && selectedVersionType === 'patch'">
          Applying a patch to your cluster will increase the Kubernetes version which can lead to unexpected side effects.<br /><br />
          <i class="orange--text text--darken-2">This action cannot be undone.</i>
        </template>
      </template>
    </confirm-dialog>
  </div>
</template>

<script>
import ShootVersionUpdate from '@/components/ShootVersionUpdate'
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import { updateShootVersion } from '@/utils/api'
import {
  availableK8sUpdatesForShoot,
  isShootMarkedForDeletion
} from '@/utils'
import get from 'lodash/get'

export default {
  components: {
    ShootVersionUpdate,
    ConfirmDialog
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
      updateDialog: false,
      selectedVersion: undefined,
      selectedVersionType: undefined,
      selectedVersionInvalid: true,
      confirmRequired: false,
      updateErrorMessage: null,
      updateDetailedErrorMessage: null
    }
  },
  computed: {
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
      return !!this.availableK8sUpdates && !this.isShootMarkedForDeletion
    },
    confirm () {
      return this.confirmRequired ? this.shootName : undefined
    },
    k8sVersion () {
      return get(this.shootItem, 'spec.kubernetes.version')
    },
    availableK8sUpdates () {
      return availableK8sUpdatesForShoot(get(this.shootItem, 'spec'))
    },
    shootName () {
      return get(this.shootItem, 'metadata.name')
    },
    shootNamespace () {
      return get(this.shootItem, 'metadata.namespace')
    },
    isShootMarkedForDeletion () {
      return isShootMarkedForDeletion(get(this.shootItem, 'metadata'))
    },
    tooltipText () {
      if (this.k8sPatchAvailable) {
        return 'Kubernetes patch available'
      } else if (this.availableK8sUpdates) {
        return 'Kubernetes upgrade available'
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
    showUpdateDialog () {
      if (this.canUpdate) {
        this.updateDialog = true
      }
    },
    hideUpdateDialog () {
      this.updateDialog = false
      this.reset()
    },
    reset () {
      const defaultData = this.$options.data.apply(this)
      Object.assign(this.$data, defaultData)

      this.$refs.shootVersionUpdate.reset()
    },
    versionUpdateConfirmed () {
      const user = this.$store.state.user
      updateShootVersion({ namespace: this.shootNamespace, name: this.shootName, user, data: { version: this.selectedVersion } })
        .then(() => this.hideUpdateDialog())
        .catch((err) => {
          this.updateErrorMessage = 'Update Kubernetes version failed'
          this.updateDetailedErrorMessage = err.message
          console.error('Update shoot version failed with error:', err)
        })
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
</style>
