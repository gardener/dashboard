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
  <g-dialog
    confirmButtonText="Change"
    :confirm-disabled="!validSettings"
    :errorMessage.sync="errorMessage"
    :detailedErrorMessage.sync="detailedErrorMessage"
    @showDialog="onShowDialog"
    max-width="600"
    defaultColor="cyan-darken-2"
    ref="gDialog"
    >
    <template slot="caption">Change Terminal Settings</template>
    <template slot="message">
      <v-text-field
        color="cyan darken-2"
        v-model="selectedContainerImage"
        label="Image"
        hint="Image to be used for the Container"
        persistent-hint
        class="mb-4"
      >
      </v-text-field>
      <v-switch
        color="cyan darken-2"
        v-model="selectedPrivilegedMode"
        label="Privileged"
        hint="When enabled this will schedule a <strong>privileged</strong> Container, with <strong>hostPID</strong> and <strong>hostNetwork</strong> enabled. In addition, the host root filesystem will be mounted under the path /hostroot."
        persistent-hint
        class="mt-2"
      ></v-switch>
      <v-select
        color="cyan darken-2"
        label="Nodes"
        :items="nodes"
        item-value="data.kubernetesHostname"
        v-model="selectedNode"
        hint="Node on which the Pod should be scheduled"
        persistent-hint
        class="mt-4 mb-2"
      >
        <template slot="item" slot-scope="data">
          <v-list-tile-content>
            <v-list-tile-title>{{data.item.data.kubernetesHostname}}</v-list-tile-title>
            <v-list-tile-sub-title>
              <span>Ready: {{data.item.data.readyStatus}} | Version: {{data.item.data.version}} | Created: <time-string :date-time="data.item.metadata.creationTimestamp" :pointInTime="-1"></time-string></span>
            </v-list-tile-sub-title>
          </v-list-tile-content>
        </template>
        <template slot="selection" slot-scope="data">
          <span class="black--text ml-2">
          {{data.item.data.kubernetesHostname}} [{{data.item.data.version}}]
          </span>
        </template>
      </v-select>
    </template>
  </g-dialog>
</template>

<script>
import GDialog from '@/dialogs/GDialog'
import TimeString from '@/components/TimeString'
import isEmpty from 'lodash/isEmpty'

export default {
  components: {
    GDialog,
    TimeString
  },
  props: {
    image: {
      type: String
    },
    node: {
      type: String
    },
    nodes: {
      type: Array
    },
    privilegedMode: {
      type: Boolean
    }
  },
  data () {
    return {
      selectedContainerImage: undefined,
      selectedNode: undefined,
      selectedPrivilegedMode: undefined,
      errorMessage: undefined,
      detailedErrorMessage: undefined
    }
  },
  computed: {
    validSettings () {
      // invalid if not set
      return !isEmpty(this.selectedContainerImage) && !isEmpty(this.selectedNode) && this.selectedPrivilegedMode !== undefined
    }
  },
  methods: {
    async confirmWithDialog () {
      const confirmed = await this.$refs.gDialog.confirmWithDialog()
      if (confirmed) {
        const selectedConfig = {
          containerImage: this.selectedContainerImage,
          node: this.selectedNode
        }
        if (this.selectedPrivilegedMode) {
          selectedConfig.privileged = true
          selectedConfig.hostPID = true
          selectedConfig.hostNetwork = true
        }
        return selectedConfig
      } else {
        return undefined
      }
    },
    onShowDialog () {
      this.reset()
    },
    hideDialog () {
      this.$refs.gDialog.hideDialog()
    },
    showDialog () {
      this.$refs.gDialog.showDialog()
    },
    reset () {
      this.selectedContainerImage = this.image
      this.selectedNode = this.node
      this.selectedPrivilegedMode = this.privilegedMode
      this.errorMessage = undefined
      this.detailedErrorMessage = undefined
    }
  }
}
</script>
