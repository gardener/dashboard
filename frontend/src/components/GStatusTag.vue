<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="visible">
    <g-popover
      v-model="internalValue"
      :placement="popperPlacement"
      :disabled="!condition.message"
      :toolbar-title="popperTitle"
      :toolbar-color="color"
    >
      <template #activator="{ props: popoverActivatorProps }">
        <v-chip
          v-bind="popoverActivatorProps"
          :class="{ 'cursor-pointer': condition.message }"
          :style="isError ? errorChipStyle : undefined"
          :variant="isError ? 'flat' : 'tonal'"
          :aria-label="chipAriaLabel"
          tabindex="0"
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

import { useErrorChipColor } from '@/composables/useAccessibleChipColor'

import {
  isUserError,
  objectsFromErrorCodes,
} from '@/utils/errorCodes'

import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import filter from 'lodash/filter'

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
    shootBinding: {
      type: Object,
    },
    popperPlacement: {
      type: String,
    },
    staleShoot: {
      type: Boolean,
    },
    shootMetadata: {
      type: Object,
      default () {
        return { uid: '' }
      },
    },
  },
  setup () {
    const { errorChipStyle } = useErrorChipColor()
    return { errorChipStyle }
  },
  computed: {
    ...mapState(useAuthzStore, [
      'canViewLandscape',
    ]),
    popoverKey () {
      return `g-status-tag[${this.condition.type}]:${this.shootMetadata.uid}`
    },
    internalValue: {
      get () {
        return this.activePopoverKey === this.popoverKey
      },
      set (value) {
        this.activePopoverKey = value ? this.popoverKey : ''
      },
    },
    popperTitle () {
      if (this.staleShoot) {
        return 'Last Status'
      }
      return this.condition.name
    },
    chipText () {
      return this.condition.shortName || ''
    },
    chipAriaLabel () {
      const status = this.staleShoot
        ? `Last status: ${this.chipStatus}`
        : this.chipStatus
      return `${this.condition.name}: ${status}`
    },
    chipStatus () {
      if (this.isError) {
        return 'Error'
      }
      if (this.isUnknown) {
        return 'Unknown'
      }
      if (this.isProgressing) {
        return 'Progressing'
      }

      return 'Healthy'
    },
    chipTooltip () {
      return {
        title: this.condition.name,
        status: this.chipStatus,
        description: this.condition.description,
        userErrorCodeObjects: filter(objectsFromErrorCodes(this.condition.codes), { userError: true }),
      }
    },
    chipIcon () {
      if (this.isUserError) {
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
      if (this.condition.status === 'False' || !isEmpty(this.condition.codes)) {
        return true
      }
      return false
    },
    isUnknown () {
      if (this.condition.status === 'Unknown') {
        return true
      }
      return false
    },
    isProgressing () {
      if (this.condition.status === 'Progressing') {
        return true
      }
      return false
    },
    isUserError () {
      return isUserError(this.condition.codes)
    },
    errorDescriptions () {
      if (this.isError) {
        return [
          {
            description: this.condition.message,
            errorCodeObjects: objectsFromErrorCodes(this.condition.codes),
          },
        ]
      }
      return undefined
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
    visible () {
      if (!this.canViewLandscape) {
        return !get(this.condition, ['showLandscapeViewerOnly'], false)
      }
      return true
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
