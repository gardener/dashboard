<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="visible">
    <g-popover
      v-model="popover"
      :placement="popperPlacement"
      :disabled="!condition.message"
      :toolbar-title="popperTitle"
      :toolbar-color="color"
    >
      <template #activator="{ props }">
        <v-chip
          v-bind="props"
          ref="tagChipRef"
          :class="{ 'cursor-pointer': condition.message }"
          :variant="!isError ? 'outlined' : 'flat'"
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
            :disabled="popover"
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
        :namespace="namespace"
      />
    </g-popover>
  </div>
</template>

<script>
import { mapState } from 'pinia'

import GShootMessageDetails from '@/components/GShootMessageDetails.vue'
import {
  isUserError,
  objectsFromErrorCodes,
} from '@/utils/errorCodes'
import {
  get,
  isEmpty,
  filter,
} from '@/utils/lodash'
import { useAuthnStore } from '@/store'

export default {
  components: {
    GShootMessageDetails,
  },
  props: {
    condition: {
      type: Object,
      required: true,
    },
    secretBindingName: {
      type: String,
    },
    namespace: {
      type: String,
    },
    popperPlacement: {
      type: String,
    },
    staleShoot: {
      type: Boolean,
    },
  },
  data () {
    return {
      popover: false,
    }
  },
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
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
    popperKeyWithType () {
      return `statusTag_${this.popperKey}`
    },
    color () {
      if (this.isUnknown || this.staleShoot) {
        return 'unknown'
      }
      if (this.isError) {
        return 'error'
      }
      if (this.isProgressing && this.isAdmin) {
        return 'info'
      }
      return 'primary'
    },
    textColor () {
      if (this.isError) {
        return 'white'
      }
      return this.color
    },
    visible () {
      if (!this.isAdmin) {
        return !get(this.condition, 'showAdminOnly', false)
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
