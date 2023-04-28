<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <v-text-field
      color="primary"
      v-model="selectedContainerImage"
      label="Image"
      hint="Image to be used for the Container"
      persistent-hint
      :error-messages="getErrorMessages('selectedContainerImage')"
      @update:model-value="$v.selectedContainerImage.$touch()"
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
          color="primary"
        ></v-radio>
        <v-radio
          label="Cluster"
          :value="true"
          color="primary"
        ></v-radio>
      </v-radio-group>
      <v-switch
        :disabled="!selectedRunOnShootWorker"
        color="primary"
        v-model="selectedPrivilegedMode"
        label="Privileged"
        hint="Enable to schedule a privileged Container, with hostPID and hostNetwork enabled. The host root filesystem will be mounted under the path /host."
        persistent-hint
        :class="{ 'ml-4': isAdmin }"
        class="ml-2"
      ></v-switch>
      <v-select
        :disabled="!selectedRunOnShootWorker"
        no-data-text="No workers available"
        color="primary"
        item-color="primary"
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
          <v-list-item-content v-if="item !== autoSelectNodeItem">
            <v-list-item-title>{{item.data.kubernetesHostname}}</v-list-item-title>
            <v-list-item-subtitle>
              <span>Ready: {{item.data.readyStatus}} | Version: {{item.data.version}} | Created: <time-string :date-time="item.metadata.creationTimestamp" mode="past"></time-string></span>
            </v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-content v-else>
            <v-list-item-title>Auto select node</v-list-item-title>
            <v-list-item-subtitle>Let the kube-scheduler decide on which node the terminal pod will be scheduled</v-list-item-subtitle>
          </v-list-item-content>
        </template>
        <template v-slot:selection="{ item }">
          <span :class="{'grey--text': !selectedRunOnShootWorker}" class="ml-2">
            <template v-if="item !== autoSelectNodeItem">
              {{item.data.kubernetesHostname}} [{{item.data.version}}]
            </template>
            <template v-else>Auto select node</template>
          </span>
        </template>
      </v-select>
      <v-alert
        v-if="isAdmin && selectedRunOnShootWorker"
        class="ml-6 mt-6 mb-2"
        :value="true"
        type="info"
        color="primary"
        variant="outlined"
      >
        <strong>Terminal will be running in an untrusted environment!</strong><br>
        Do not enter credentials or sensitive data within the terminal session that cluster owners should not have access to, as the terminal will be running on one of the worker nodes.
      </v-alert>
    </template>
  </div>
</template>

<script>
import TimeString from '@/components/TimeString.vue'
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
      autoSelectNodeItem: {
        data: {
          kubernetesHostname: -1 // node will be auto selected by the kube-scheduler. Value needs to be set to any value
        }
      },
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
    selectedConfig () {
      const node = this.selectedNode === this.autoSelectNodeItem.data.kubernetesHostname
        ? undefined
        : this.selectedNode

      const preferredHost = this.selectedRunOnShootWorker ? 'shoot' : 'seed'

      const selectedConfig = {
        container: {
          image: this.selectedContainerImage,
          privileged: this.selectedPrivilegedMode
        },
        node,
        preferredHost,
        hostPID: this.selectedPrivilegedMode,
        hostNetwork: this.selectedPrivilegedMode
      }

      return selectedConfig
    }
  },
  methods: {
    initialize ({ container = {}, defaultNode, currentNode, privilegedMode, nodes = [] }) {
      this.selectedContainerImage = container.image
      if (!defaultNode) {
        defaultNode = this.isAdmin
          ? get(head(nodes), 'data.kubernetesHostname')
          : this.autoSelectNodeItem.data.kubernetesHostname
      }
      this.selectedNode = defaultNode
      this.shootNodes = [this.autoSelectNodeItem, ...nodes]
      if (!this.isAdmin) {
        this.selectedRunOnShootWorker = true
      } else {
        const currentNodeIsShootWorker = some(nodes, ['data.kubernetesHostname', currentNode])
        this.selectedRunOnShootWorker = currentNodeIsShootWorker
      }
      this.selectedPrivilegedMode = privilegedMode

      // in case "initialize" is called with the same parameters, selectedConfig does not change and hence the watch is not called. Make sure that selectedConfig is emitted in any case
      this.$emit('selected-config', this.selectedConfig)
      this.$emit('valid-settings', this.validSettings)
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    }
  },
  watch: {
    selectedConfig () {
      this.$emit('selected-config', this.selectedConfig)
    },
    validSettings () {
      this.$emit('valid-settings', this.validSettings)
    }
  }
}
</script>
