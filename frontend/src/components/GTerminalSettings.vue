<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <v-text-field
      v-model="selectedContainerImage"
      color="primary"
      label="Image"
      hint="Image to be used for the Container"
      persistent-hint
      :error-messages="getErrorMessages('selectedContainerImage')"
      variant="underlined"
      @update:model-value="v$.selectedContainerImage.$touch()"
      @blur="v$.selectedContainerImage.$touch()"
    />
    <template v-if="target === 'shoot'">
      <v-radio-group
        v-if="isAdmin"
        v-model="selectedRunOnShootWorker"
        label="Terminal Runtime"
        class="mt-6"
        hint="Choose &quot;Cluster&quot; if you want to troubleshoot a worker node of the cluster"
        persistent-hint
      >
        <v-radio
          label="Infrastructure (Seed)"
          :value="false"
          color="primary"
        />
        <v-radio
          label="Cluster"
          :value="true"
          color="primary"
        />
      </v-radio-group>
      <v-switch
        v-model="selectedPrivilegedMode"
        :disabled="!selectedRunOnShootWorker"
        color="primary"
        label="Privileged"
        hint="Enable to schedule a privileged Container, with hostPID and hostNetwork enabled. The host root filesystem will be mounted under the path /host."
        persistent-hint
        :class="{ 'ml-4': isAdmin }"
        class="ml-2"
      />
      <v-select
        v-model="selectedNode"
        :disabled="!selectedRunOnShootWorker"
        no-data-text="No workers available"
        color="primary"
        item-color="primary"
        label="Node"
        placeholder="Change worker node..."
        :items="shootNodes"
        item-value="data.kubernetesHostname"
        hint="Node on which the Pod should be scheduled"
        persistent-hint
        :class="{ 'ml-4': isAdmin }"
        class="ml-2"
        variant="underlined"
      >
        <template #item="{ item, props }">
          <v-list-item
            v-if="!isAutoSelectNodeItem(item)"
            v-bind="props"
            :title="item.raw.data?.kubernetesHostname"
          >
            <v-list-item-subtitle>
              Ready: {{ item.raw.data.readyStatus }} | Version: {{ item.raw.data.version }} | Created: <g-time-string
                :date-time="item.raw.metadata.creationTimestamp"
                mode="past"
              />
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item
            v-else
            v-bind="props"
            title="Auto select node"
            subtitle="Let the kube-scheduler decide on which node the terminal pod will be scheduled"
          />
        </template>
        <template #selection="{ item }">
          <span
            v-if="selectedRunOnShootWorker"
            :class="{'text-grey': !selectedRunOnShootWorker}"
            class="ml-2"
          >
            <template v-if="!isAutoSelectNodeItem(item)">
              {{ item.raw.data?.kubernetesHostname }} [{{ item.raw.data?.version }}]
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
import { defineComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { mapState } from 'pinia'
import {
  useAuthnStore,
} from '@/store'
import GTimeString from '@/components/GTimeString.vue'
import { required } from '@vuelidate/validators'
import some from 'lodash/some'
import get from 'lodash/get'
import head from 'lodash/head'
import { getValidationErrors } from '@/utils'

const validationErrors = {
  selectedContainerImage: {
    required: 'You can\'t leave this empty.',
  },
}

export default defineComponent({
  components: {
    GTimeString,
  },
  props: {
    target: {
      type: String,
    },
  },
  emits: [
    'selected-config',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      autoSelectNodeItem: {
        data: {
          kubernetesHostname: -1, // node will be auto selected by the kube-scheduler. Value needs to be set to any value
        },
      },
      selectedRunOnShootWorkerInternal: false,
      selectedContainerImage: undefined,
      selectedNode: undefined,
      selectedPrivilegedMode: undefined,
      shootNodesInternal: [],
      validationErrors,
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    validators () {
      return {
        selectedContainerImage: {
          required,
        },
      }
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
      },
    },
    shootNodes: {
      get () {
        return this.selectedRunOnShootWorker ? this.shootNodesInternal : []
      },
      set (value) {
        this.shootNodesInternal = value
      },
    },
    selectedConfig () {
      const node = this.selectedNode === this.autoSelectNodeItem.data.kubernetesHostname
        ? undefined
        : this.selectedNode

      const preferredHost = this.selectedRunOnShootWorker ? 'shoot' : 'seed'

      const selectedConfig = {
        container: {
          image: this.selectedContainerImage,
          privileged: this.selectedPrivilegedMode,
        },
        node,
        preferredHost,
        hostPID: this.selectedPrivilegedMode,
        hostNetwork: this.selectedPrivilegedMode,
      }

      return selectedConfig
    },
  },
  watch: {
    selectedConfig () {
      this.$emit('selected-config', this.selectedConfig)
    },
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
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    isAutoSelectNodeItem (item) {
      return item.raw.data?.kubernetesHostname === this.autoSelectNodeItem.data?.kubernetesHostname
    },
  },
})
</script>
