<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="internalValue"
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
          :disabled="internalValue"
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
      :status-title="chipStatus"
      :last-message="nonErrorMessage"
      :error-descriptions="errorDescriptions"
      :last-transition-time="condition.lastTransitionTime"
      :secret-binding-name="secretBindingName"
      :namespace="shootMetadata.namespace"
    />
  </g-popover>
</template>

<script setup>
import {
  inject,
  computed,
} from 'vue'

import { useAuthnStore } from '@/store/authn'

import GShootMessageDetails from '@/components/GShootMessageDetails.vue'

import {
  isUserError,
  objectsFromErrorCodes,
} from '@/utils/errorCodes'

import {
  isEmpty,
  filter,
} from '@/lodash'

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

const activePopoverKey = inject('activePopoverKey')

const authnStore = useAuthnStore()
const isAdmin = computed(() => authnStore.isAdmin)

const popoverKey = computed(() => {
  return `g-readiness-chip[${props.condition.type}]:${props.shootMetadata.uid}`
})

const internalValue = computed({
  get () {
    return activePopoverKey.value === popoverKey.value
  },
  set (value) {
    activePopoverKey.value = value ? popoverKey.value : ''
  },
})

const popperTitle = computed(() => {
  if (props.staleShoot) {
    return 'Last Status'
  }
  return props.condition.name
})

const chipText = computed(() => props.condition.shortName || '')

const chipStatus = computed(() => {
  if (isError.value) {
    return 'Error'
  }
  if (isUnknown.value) {
    return 'Unknown'
  }
  if (isProgressing.value) {
    return 'Progressing'
  }
  return 'Healthy'
})

const chipTooltip = computed(() => ({
  title: props.condition.name,
  status: chipStatus.value,
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

const isError = computed(() => {
  if (props.condition.status === 'False' || !isEmpty(props.condition.codes)) {
    return true
  }
  return false
})

const isUnknown = computed(() => {
  return props.condition.status === 'Unknown'
})

const isProgressing = computed(() => {
  return props.condition.status === 'Progressing'
})

const errorDescriptions = computed(() => {
  if (isError.value) {
    return [
      {
        description: props.condition.message,
        errorCodeObjects: objectsFromErrorCodes(props.condition.codes),
      },
    ]
  }
  return undefined
})

const nonErrorMessage = computed(() => {
  if (!isError.value) {
    return props.condition.message
  }
  return undefined
})

const color = computed(() => {
  if (isUnknown.value || props.staleShoot) {
    return 'unknown'
  }
  if (isError.value) {
    return 'error'
  }
  if (isProgressing.value && isAdmin.value) {
    return 'info'
  }
  return 'primary'
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
