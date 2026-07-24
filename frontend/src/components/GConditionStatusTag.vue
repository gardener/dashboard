<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="visible">
    <g-popover
      v-model="internalValue"
      :placement="popperPlacement"
      :disabled="!condition.message"
      :toolbar-title="toolbarTitle"
      :toolbar-color="color"
    >
      <template #toolbar-title>
        <span>{{ toolbarTitle }}</span>
        <template v-if="resourceName">
          - <span class="font-family-monospace font-weight-bold">{{ resourceName }}</span>
        </template>
      </template>
      <template #activator="{ props: popoverActivatorProps }">
        <v-chip
          v-bind="popoverActivatorProps"
          :class="{ 'cursor-pointer': condition.message }"
          :variant="isError ? 'flat' : 'tonal'"
          :aria-label="chipAriaLabel"
          tabindex="0"
          size="small"
          :color="chipColor"
          class="status-tag"
        >
          <v-icon
            v-if="chipIcon"
            :icon="chipIcon"
            size="x-small"
            class="chip-icon"
          />
          {{ chipText }}
          <g-status-tag-tooltip
            activator="parent"
            :description="chipTooltip.description"
            :disabled="internalValue"
            :title="chipTooltip.title"
            :user-errors="chipTooltip.userErrorCodeObjects"
          />
        </v-chip>
      </template>
      <g-shoot-message-details
        :status-title="chipStatus"
        :last-message="nonErrorMessage"
        :error-descriptions="errorDescriptions"
        :last-transition-time="condition.lastTransitionTime"
        :shoot-binding="shootBinding"
      />
    </g-popover>
  </div>
</template>

<script>
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'

import GShootMessageDetails from '@/components/GShootMessageDetails.vue'
import GStatusTagTooltip from '@/components/GStatusTagTooltip.vue'

import {
  CONDITION_STATES,
  conditionState,
} from '@/composables/useStatusConditions'

import {
  isUserError,
  objectsFromErrorCodes,
} from '@/utils/errorCodes'
import {
  getFlatColorName,
  getTonalColorName,
} from '@/utils/themeColors'

import filter from 'lodash/filter'

const conditionStateLabels = Object.freeze({
  [CONDITION_STATES.ERROR]: 'Error',
  [CONDITION_STATES.UNKNOWN]: 'Unknown',
  [CONDITION_STATES.PROGRESSING]: 'Progressing',
  [CONDITION_STATES.HEALTHY]: 'Healthy',
})

export default {
  components: {
    GShootMessageDetails,
    GStatusTagTooltip,
  },
  inject: [
    'activePopoverKey',
  ],
  props: {
    condition: {
      type: Object,
      required: true,
    },
    identifier: {
      type: String,
      required: true,
    },
    popoverKeyPrefix: {
      type: String,
      required: true,
    },
    resourceName: {
      type: String,
    },
    shootBinding: {
      type: Object,
    },
    popperPlacement: {
      type: String,
    },
    stale: {
      type: Boolean,
    },
  },
  computed: {
    ...mapState(useAuthzStore, [
      'canViewLandscape',
    ]),
    popoverKey () {
      return `${this.popoverKeyPrefix}[${this.condition.type}]:${this.identifier}`
    },
    internalValue: {
      get () {
        return this.activePopoverKey === this.popoverKey
      },
      set (value) {
        this.activePopoverKey = value ? this.popoverKey : ''
      },
    },
    toolbarTitle () {
      return this.stale ? 'Last Status' : this.condition.name
    },
    chipText () {
      return this.condition.shortName || ''
    },
    chipAriaLabel () {
      const status = this.stale
        ? `Last status: ${this.chipStatus}`
        : this.chipStatus
      return `${this.condition.name}: ${status}`
    },
    state () {
      return conditionState(this.condition)
    },
    chipStatus () {
      return conditionStateLabels[this.state]
    },
    chipTooltip () {
      return {
        title: this.condition.name,
        description: this.condition.description,
        userErrorCodeObjects: filter(objectsFromErrorCodes(this.condition.codes), { userError: true }),
      }
    },
    chipIcon () {
      if (this.hasUserError) {
        return 'mdi-account-alert-outline'
      }
      if (this.isError) {
        return 'mdi-alert-circle-outline'
      }
      if (this.isUnknown) {
        return 'mdi-help-circle-outline'
      }
      if (this.isProgressing && this.canViewLandscape) {
        return 'mdi-progress-alert'
      }

      return ''
    },
    isError () {
      return this.state === CONDITION_STATES.ERROR
    },
    isUnknown () {
      return this.state === CONDITION_STATES.UNKNOWN
    },
    isProgressing () {
      return this.state === CONDITION_STATES.PROGRESSING
    },
    hasUserError () {
      return isUserError(this.condition.codes)
    },
    errorDescriptions () {
      if (!this.isError) {
        return undefined
      }
      return [
        {
          description: this.condition.message,
          errorCodeObjects: objectsFromErrorCodes(this.condition.codes),
        },
      ]
    },
    nonErrorMessage () {
      if (!this.isError) {
        return this.condition.message
      }
      return undefined
    },
    color () {
      if (this.isUnknown || this.staleShoot) {
        return 'unknown'
      }
      if (this.isError) {
        return 'error'
      }
      if (this.isProgressing && this.canViewLandscape) {
        return 'info'
      }
      return 'primary'
    },
    chipColor () {
      return this.isError
        ? getFlatColorName(this.color)
        : getTonalColorName(this.color)
    },
    visible () {
      return this.canViewLandscape || !this.condition.showLandscapeViewerOnly
    },
  },
}
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
