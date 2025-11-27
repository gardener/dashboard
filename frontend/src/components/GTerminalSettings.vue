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
      :error-messages="getErrorMessages(v$.containerImage)"
      variant="underlined"
      @update:model-value="v$.containerImage.$touch()"
      @blur="v$.containerImage.$touch()"
    />
    <template v-if="!runtimeSettingsHidden">
      <v-radio-group
        v-if="isAdmin"
        v-model="runtime"
        label="Terminal Runtime"
        class="mt-6"
        hint="Choose &quot;Cluster&quot; if you want to troubleshoot a worker node of the cluster"
        persistent-hint
      >
        <div>
          <v-radio
            label="Infrastructure (Seed)"
            value="seed"
            color="primary"
            :disabled="!canScheduleOnSeed"
          />
          <div
            v-tooltip="{
              text: 'Terminals can only be scheduled if the seed is a managed seed',
              location: 'top left',
              disabled: canScheduleOnSeed
            }"
          />
        </div>
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
    </template>
  </div>
</template>

<script>
import { toRefs } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { mapState } from 'pinia'
import { required } from '@vuelidate/validators'

import { useAuthnStore } from '@/store/authn'

import GTimeString from '@/components/GTimeString.vue'

import { useTerminalConfig } from '@/composables/useTerminalConfig'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

export default {
  components: {
    GTimeString,
  },
  props: {
    runtimeSettingsHidden: {
      type: Boolean,
      default: false,
    },
  },
  setup (props) {
    const { state } = useTerminalConfig()
    const {
      node,
      containerImage,
      shootNodes,
      privilegedMode,
      runtime,
      canScheduleOnSeed,
    } = toRefs(state)

    const rules = {
      containerImage: withFieldName('Terminal Container Image', {
        required,
      }),
    }

    return {
      v$: useVuelidate(rules, { containerImage }),
      node,
      containerImage,
      shootNodes,
      privilegedMode,
      runtime,
      canScheduleOnSeed,
    }
  },
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    shootNodesInternal () {
      return this.runtime === 'shoot' ? this.shootNodes : []
    },
  },
  methods: {
    isAutoSelectNodeItem (item) {
      return this.isAutoSelectNode(item.raw.data?.kubernetesHostname)
    },
    isAutoSelectNode (hostname) {
      return hostname === '<AUTO-SELECT>'
    },
    getErrorMessages,
  },
}
</script>
