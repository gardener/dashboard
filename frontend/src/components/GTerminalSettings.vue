<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <v-text-field
      v-model="containerImage"
      color="primary"
      label="Image"
      hint="Image to be used for the Container"
      persistent-hint
      :error-messages="getErrorMessages('containerImage')"
      variant="underlined"
      @update:model-value="v$.containerImage.$touch()"
      @blur="v$.containerImage.$touch()"
    />
    <template v-if="target === 'shoot' && !hideRuntimeSettings">
      <v-radio-group
        v-if="isAdmin"
        v-model="runtime"
        label="Terminal Runtime"
        class="mt-6"
        hint="Choose &quot;Cluster&quot; if you want to troubleshoot a worker node of the cluster"
        persistent-hint
      >
        <v-radio
          label="Infrastructure (Seed)"
          value="seed"
          color="primary"
        />
        <v-radio
          label="Cluster"
          value="shoot"
          color="primary"
        />
      </v-radio-group>
      <v-switch
        v-model="privilegedMode"
        :disabled="runtime === 'seed'"
        color="primary"
        label="Privileged"
        hint="Enable to schedule a privileged Container, with hostPID and hostNetwork enabled. The host root filesystem will be mounted under the path /host."
        persistent-hint
        :class="{ 'ml-4': isAdmin }"
        class="ml-2"
      />
      <v-select
        v-model="node"
        :disabled="runtime === 'seed'"
        no-data-text="No workers available"
        color="primary"
        item-color="primary"
        label="Node"
        placeholder="Change worker node..."
        :items="shootNodesInternal"
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
            v-if="runtime === 'shoot'"
            :class="{'text-grey': runtime === 'seed'}"
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
        v-if="isAdmin && runtime === 'shoot'"
        class="ml-6 mt-6 mb-2"
        :model-value="true"
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
import { useVuelidate } from '@vuelidate/core'
import { mapState } from 'pinia'
import { required } from '@vuelidate/validators'

import { useAuthnStore } from '@/store/authn'

import GTimeString from '@/components/GTimeString.vue'

import { getValidationErrors } from '@/utils'

const validationErrors = {
  containerImage: {
    required: 'You can\'t leave this empty.',
  },
}

export default {
  components: {
    GTimeString,
  },
  inject: [
    'node',
    'containerImage',
    'shootNodes',
    'privilegedMode',
    'runtime',
  ],
  props: {
    target: {
      type: String,
    },
    hideRuntimeSettings: {
      type: Boolean,
      default: false,
    },
  },
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
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
        containerImage: {
          required,
        },
      }
    },
    shootNodesInternal () {
      return this.runtime === 'shoot' ? this.shootNodes : []
    },
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    isAutoSelectNodeItem (item) {
      return this.isAutoSelectNode(item.raw.data?.kubernetesHostname)
    },
    isAutoSelectNode (hostname) {
      return hostname === '<AUTO-SELECT>'
    },
  },
}
</script>
