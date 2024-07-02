<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="internalPopoverValue"
    :placement="popperPlacement"
    :disabled="!condition.message"
    :toolbar-title="popperTitle"
    :toolbar-color="color"
  >
    <template #activator="{ props: popoverProps }">
      <v-chip
        v-bind="popoverProps"
        ref="tagChipRef"
        :class="{ 'cursor-pointer': condition.message }"
        :variant="!isError ? 'tonal' : 'flat'"
        :text-color="textColor"
        size="small"
        :color="color"
        class="status-tag"
      >
        <v-icon
          v-if="chipIcon"
          :icon="chipIcon"
          size="x-small"
          class="chip-icon"
        />
        {{ chipText }}
        <v-tooltip
          :activator="$refs.tagChipRef"
          location="top"
          max-width="400px"
          :disabled="internalPopoverValue"
        >
          <div class="font-weight-bold">
            {{ chipTooltip.title }}
          </div>
          <div>Status: {{ chipTooltip.status }}</div>
          <div
            v-for="({ shortDescription }) in chipTooltip.userErrorCodeObjects"
            :key="shortDescription"
          >
            <v-icon
              class="mr-1"
              color="white"
              size="small"
            >
              mdi-account-alert
            </v-icon>
            <span class="font-weight-bold text--lighten-2">{{ shortDescription }}</span>
          </div>
          <template v-if="chipTooltip.description">
            <v-divider color="white" />
            <div>
              {{ chipTooltip.description }}
            </div>
          </template>
        </v-tooltip>
      </v-chip>
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
</template>

<script setup>
import { computed } from 'vue'

import { useAuthnStore } from '@/store/authn'

import GShootMessageDetails from '@/components/GShootMessageDetails.vue'

import { useShootReadiness } from '@/composables/useShootReadiness'

import {
  isUserError,
  objectsFromErrorCodes,
} from '@/utils/errorCodes'

import { filter } from '@/lodash'

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
  isError,
  isUnknown,
  isProgressing,
  errorDescriptions,
  statusTitle,
  color,
  nonErrorMessage,
  internalPopoverValue,
  popperTitle,
} = useShootReadiness(props.condition, props.staleShoot, props.shootMetadata)

const authnStore = useAuthnStore()
const isAdmin = computed(() => authnStore.isAdmin)

const chipText = computed(() => props.condition.shortName || '')

const chipTooltip = computed(() => ({
  title: props.condition.name,
  status: statusTitle.value,
  description: props.condition.description,
  userErrorCodeObjects: filter(objectsFromErrorCodes(props.condition.codes), { userError: true }),
}))

const chipIcon = computed(() => {
  if (isUserError(props.condition.codes)) {
    return 'mdi-account-alert-outline'
  }
  if (isError.value) {
    return 'mdi-alert-circle-outline'
  }
  if (isUnknown.value) {
    return 'mdi-help-circle-outline'
  }
  if (isProgressing.value && isAdmin.value) {
    return 'mdi-progress-alert'
  }
  return ''
})

const textColor = computed(() => {
  if (isError.value) {
    return 'white'
  }
  return color.value
})
</script>

<style lang="scss" scoped>
  .status-tag {
    margin: 0 1px;

    &.cursor-pointer :deep(.v-chip__content) {
      cursor: pointer;
    }

    :deep(.v-chip__content) {
      margin: -2px;
    }

    .chip-icon {
      margin-left: -4px;
      margin-right: 1px;
    }
  }
</style>
