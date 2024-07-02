<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <div :class="['health-segment', stateClass]">
    <v-tooltip
      :text="condition.name"
      location="top"
      activator="parent"
      :disabled="internalPopoverValue"
    />
    <g-popover
      v-model="internalPopoverValue"
      :placement="popperPlacement"
      :disabled="!condition.message"
      :toolbar-title="popperTitle"
      :toolbar-color="color"
    >
      <template #activator="{ props: popoverProps }">
        <div
          v-bind="popoverProps"
          :class="{ 'cursor-pointer': condition.message }"
          style="width:100%; height:100%; position: absolute;"
        />
      </template>
      <g-shoot-message-details
        :status-title="statusTitle"
        :last-message="nonErrorMessage"
        :error-descriptions="errorDescriptions"
        :last-transition-time="condition.lastTransitionTime"
        :secret-binding-name="secretBindingName"
        :namespace="shootMetadata.namespace"
      />
    </g-popover>
  </div>
</template>

<script setup>
import { computed } from 'vue'

import { useAuthnStore } from '@/store/authn'

import GShootMessageDetails from '@/components/GShootMessageDetails.vue'

import { useShootReadiness } from '@/composables/useShootReadiness'

const props = defineProps({
  condition: {
    type: Object,
    required: true,
  },
  secretBindingName: {
    type: String,
  },
  popperPlacement: {
    type: String,
  },
  staleShoot: {
    type: Boolean,
  },
  shootMetadata: {
    type: Object,
    default: () => ({ uid: '' }),
  },
})

const {
  errorDescriptions,
  statusTitle,
  color,
  nonErrorMessage,
  internalPopoverValue,
  popperTitle,
  status,
} = useShootReadiness(props.condition, props.staleShoot, props.shootMetadata)

const authnStore = useAuthnStore()
const isAdmin = computed(() => authnStore.isAdmin)

const stateClass = computed(() => {
  if (status.value === 'progressing' && !isAdmin.value) {
    return 'health-segment-healthy'
  }
  return `health-segment-${status.value}`
})
</script>

<style scoped>
  .health-segment {
    margin: 1px;
    z-index: 1;
    filter: brightness(1); /* Initial brightness */
    transition: all .2s; /* Smooth transition */
  }

  .health-segment:hover {
    filter: brightness(1.3); /* Brightness on hover */
    z-index: 2;
  }

  .health-segment-healthy {
    background-color: rgb(var(--v-theme-primary));
    height: 19px;
    margin-top: 0px;
  }
  .health-segment-progressing {
    background-color: rgb(var(--v-theme-info));
    height: 13px;
    margin-top: 6px;
  }
  .health-segment-error {
    background-color: rgb(var(--v-theme-error));
    height: 19px;
    margin-top: 21px;
  }
  .health-segment-unknown {
    background-color: rgb(var(--v-theme-unknown));
    height: 14px;
    margin-top: 13px;
  }

</style>
