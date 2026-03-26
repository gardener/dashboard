<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="visible"
    class="status-tag-wrapper"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <g-popover
      v-model="internalValue"
      :placement="popperPlacement"
      :disabled="!condition.message"
      :toolbar-title="popperTitle"
      :toolbar-color="color"
    >
      <template #activator="{ props }">
        <v-chip
          v-bind="props"
          ref="tagChipRef"
          :class="chipClasses"
          :variant="chipVariant"
          :text-color="textColor"
          size="small"
          :color="color"
          class="status-tag"
        >
          <v-icon
            v-if="chipIcon && !isCollapsed"
            :icon="chipIcon"
            size="x-small"
            class="chip-icon"
          />
          <span
            v-if="!isCollapsed"
            class="chip-label"
          >{{ chipText }}</span>
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
        :shoot-binding="shootBinding"
      />
    </g-popover>
  </div>
</template>

<script>
import { mapState } from 'pinia'

import { useAuthnStore } from '@/store/authn'

import GShootMessageDetails from '@/components/GShootMessageDetails.vue'

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
    containerHovered: {
      type: Boolean,
      default: false,
    },
  },
  data () {
    return {
      selfExpanded: false,
      expandTimer: null,
    }
  },
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    isHealthy () {
      return !this.isError && !this.isUnknown && !this.isProgressing
    },
    isCollapsed () {
      return !this.isError && !this.selfExpanded && !this.internalValue
    },
    chipClasses () {
      return {
        'cursor-pointer': this.condition.message,
        'status-tag--collapsed': this.isCollapsed,
      }
    },
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
      if (this.isProgressing && this.isAdmin) {
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
        return 'unknown-lighten-3'
      }
      if (this.isError) {
        return 'error'
      }
      if (this.isProgressing && this.isAdmin) {
        return 'info'
      }
      return 'success'
    },
    chipVariant () {
      if (this.isError) {
        return 'flat'
      }
      return 'tonal'
    },
    textColor () {
      if (this.isUnknown) {
        return this.color
      }
      return 'white'
    },
    visible () {
      if (!this.isAdmin) {
        return !get(this.condition, ['showAdminOnly'], false)
      }
      return true
    },
  },
  watch: {
    containerHovered (val) {
      if (!val) {
        clearTimeout(this.expandTimer)
        this.selfExpanded = false
      }
    },
  },
  beforeUnmount () {
    clearTimeout(this.expandTimer)
  },
  methods: {
    onMouseEnter () {
      clearTimeout(this.expandTimer)
      this.expandTimer = setTimeout(() => {
        this.selfExpanded = true
      }, 100)
    },
    onMouseLeave () {
      clearTimeout(this.expandTimer)
    },
  },
}
</script>

<style lang="scss" scoped>
  .status-tag-wrapper {
    display: inline-flex;
    align-items: center;
  }

  .status-tag {
    margin: 0 1px;
    transition: max-width 0.3s ease, padding 0.3s ease;
    overflow: hidden;

    &.cursor-pointer :deep(.v-chip__content) {
      cursor: pointer;
    }

    :deep(.v-chip__content) {
      margin: -2px;
      white-space: nowrap;
    }

    .chip-icon {
      margin-left: -4px;
      margin-right: 1px;
    }

    &.status-tag--collapsed {
      max-width: 8px;
      min-width: 8px;
      padding: 0;
      border-radius: 4px;
      justify-content: center;

      :deep(.v-chip__content) {
        margin: 0;
        padding: 0;
      }
    }

  }
</style>
