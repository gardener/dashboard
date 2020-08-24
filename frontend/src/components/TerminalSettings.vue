<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    <v-text-field
      color="cyan darken-2"
      v-model="selectedContainerImage"
      label="Image"
      hint="Image to be used for the Container"
      persistent-hint
      :error-messages="getErrorMessages('selectedContainerImage')"
      @input="$v.selectedContainerImage.$touch()"
      @blur="$v.selectedContainerImage.$touch()"
    >
    </v-text-field>
    <template v-if="target === 'shoot'">
      <v-radio-group
        v-if="isAdmin"
        v-model="selectedRunOnShootWorker"
        label="Terminal Runtime"
        class="mt-6"
        hint='Choose "Cluster" if you want to troubleshoot a worker node of the cluster'
        persistent-hint
      >
        <v-radio
          label="Infrastructure (Seed)"
          :value="false"
          color="cyan darken-2"
        ></v-radio>
        <v-radio
          label="Cluster"
          :value="true"
          color="cyan darken-2"
        ></v-radio>
      </v-radio-group>
      <v-switch
        :disabled="!selectedRunOnShootWorker"
        color="cyan darken-2"
        v-model="selectedPrivilegedMode"
        label="Privileged"
        hint="Enable to schedule a privileged Container, with hostPID and hostNetwork enabled. The host root filesystem will be mounted under the path /hostroot."
        persistent-hint
        :class="{ 'ml-4': isAdmin }"
        class="ml-2"
      ></v-switch>
      <v-select
        :disabled="!selectedRunOnShootWorker"
        no-data-text="No workers available"
        color="cyan darken-2"
        item-color="cyan darken-2"
        label="Node"
        placeholder="Change worker node..."
        :items="shootNodes"
        item-value="data.kubernetesHostname"
        v-model="selectedNode"
        hint="Node on which the Pod should be scheduled"
        persistent-hint
        :class="{ 'ml-4': isAdmin }"
        class="ml-2"
      >
        <template v-slot:item="{ item }">
          <v-list-item-content>
            <v-list-item-title>{{item.data.kubernetesHostname}}</v-list-item-title>
            <v-list-item-subtitle>
              <span>Ready: {{item.data.readyStatus}} | Version: {{item.data.version}} | Created: <time-string :date-time="item.metadata.creationTimestamp" :pointInTime="-1"></time-string></span>
            </v-list-item-subtitle>
          </v-list-item-content>
        </template>
        <template v-slot:selection="{ item }">
          <span :class="nodeTextColor" class="ml-2">
          {{item.data.kubernetesHostname}} [{{item.data.version}}]
          </span>
        </template>
      </v-select>
      <v-alert
        v-if="isAdmin && selectedRunOnShootWorker"
        class="ml-6 mt-6 mb-2"
        :value="true"
        type="info"
        color="cyan darken-2"
        outlined
      >
        <strong>Terminal will be running in an untrusted environment!</strong><br>
        Do not enter credentials or sensitive data within the terminal session that cluster owners should not have access to, as the terminal will be running on one of the worker nodes.
      </v-alert>
    </template>
  </div>
</template>

<script>
import TimeString from '@/components/TimeString'
import { required } from 'vuelidate/lib/validators'
import isEmpty from 'lodash/isEmpty'
import { mapGetters } from 'vuex'
import some from 'lodash/some'
import get from 'lodash/get'
import head from 'lodash/head'
import { getValidationErrors } from '@/utils'

const validationErrors = {
  selectedContainerImage: {
    required: 'You can\'t leave this empty.'
  }
}

export default {
  components: {
    TimeString
  },
  props: {
    target: {
      type: String
    }
  },
  data () {
    return {
      selectedRunOnShootWorkerInternal: false,
      selectedContainerImage: undefined,
      selectedNode: undefined,
      selectedPrivilegedMode: undefined,
      shootNodesInternal: [],
      validationErrors
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    ...mapGetters([
      'isAdmin'
    ]),
    validSettings () {
      return !isEmpty(this.selectedContainerImage)
    },
    validators () {
      const validators = {
        selectedContainerImage: {
          required
        }
      }
      return validators
    },
    selectedRunOnShootWorker: {
      get () {
        return this.selectedRunOnShootWorkerInternal
      },
      set (value) {
        /* If user is admin, the default runtime is an infrastructure cluster.
        An admin would usually only choose the cluster as terminal runtime when in need of troubleshooting the worker nodes. Hence, enable privileged mode automatically.
        */
        if (this.isAdmin) {
          this.selectedPrivilegedMode = value
        }
        this.selectedRunOnShootWorkerInternal = value
      }
    },
    shootNodes: {
      get () {
        return this.selectedRunOnShootWorker ? this.shootNodesInternal : []
      },
      set (value) {
        this.shootNodesInternal = value
      }
    },
    nodeTextColor () {
      return this.selectedRunOnShootWorker ? 'black--text' : 'grey--text'
    },
    selectedConfig () {
      const selectedConfig = {
        container: {
          image: this.selectedContainerImage
        },
        node: this.selectedNode
      }
      if (this.selectedPrivilegedMode) {
        selectedConfig.container.privileged = true
        selectedConfig.hostPID = true
        selectedConfig.hostNetwork = true
      }
      if (this.selectedRunOnShootWorker) {
        selectedConfig.preferredHost = 'shoot'
      }
      return selectedConfig
    }
  },
  methods: {
    initialize ({ container = {}, defaultNode, currentNode, privilegedMode, nodes }) {
      this.selectedContainerImage = container.image
      defaultNode = defaultNode || get(head(nodes), 'data.kubernetesHostname')
      this.selectedNode = defaultNode
      this.shootNodes = nodes
      if (!this.isAdmin) {
        this.selectedRunOnShootWorker = true
      } else {
        const currentNodeIsShootWorker = some(nodes, ['data.kubernetesHostname', currentNode])
        this.selectedRunOnShootWorker = currentNodeIsShootWorker
      }
      this.selectedPrivilegedMode = privilegedMode
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    }
  },
  watch: {
    selectedConfig () {
      this.$emit('selectedConfig', this.selectedConfig)
    },
    validSettings () {
      this.$emit('validSettings', this.validSettings)
    }
  }
}
</script>
