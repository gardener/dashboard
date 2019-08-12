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
      <v-btn slot="activator" icon @click="showDialog" :disabled="isShootMarkedForDeletion || isShootActionsDisabledForPurpose">
        <v-icon medium>{{icon}}</v-icon>
      </v-btn>
      {{shootActionToolTip(caption)}}
    </v-tooltip>
    <confirm-dialog
      confirmButtonText="Save"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
      ref="confirmDialog"
      confirmColor="orange"
      defaultColor="orange"
      >
      <template slot="caption">{{caption}}</template>
      <template slot="affectedObjectName">{{shootName}}</template>
      <template slot="message">
        <v-layout row wrap>
          <manage-shoot-addons
            ref="addons"
           ></manage-shoot-addons>
        </v-layout>
      </template>
    </confirm-dialog>
  </div>
</template>

<script>
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import ManageShootAddons from '@/components/ManageShootAddons'
import { updateShootAddons } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { shootGetters } from '@/mixins/shootGetters'
import get from 'lodash/get'

export default {
  name: 'addon-configuration',
  components: {
    ConfirmDialog,
    ManageShootAddons
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootGetters],
  data () {
    return {
      dialog: false,
      errorMessage: null,
      detailedErrorMessage: null,
      addons: null,
      caption: 'Configure Add-ons',
      icon: 'mdi-settings-outline'
    }
  },
  methods: {
    async showDialog (reset = true) {
      if (await this.$refs.confirmDialog.confirmWithDialog(() => {
        if (reset) {
          this.reset()
        }
      })) {
        try {
          this.addons = this.$refs.addons.getAddons()
          await updateShootAddons({ namespace: this.shootNamespace, name: this.shootName, data: this.addons })
        } catch (err) {
          const errorDetails = errorDetailsFromError(err)
          this.errorMessage = 'Could not update addons'
          this.detailedErrorMessage = errorDetails.detailedMessage
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
          this.showDialog(false)
        }
      }
    },
    reset () {
      this.errorMessage = null
      this.detailedErrorMessage = null

      this.$nextTick(() => {
        this.$refs.addons.updateAddons(get(this.shootItem, 'spec.addons', {}))
      })
    }
  }
}
</script>
