<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="visible">
    <g-popper
      @input="onPopperInput"
      :title="popperTitle"
      :toolbar-color="color"
      :popper-key="popperKeyWithType"
      :placement="popperPlacement"
      :disabled="!condition.message">
      <template v-slot:popperRef>
        <div>
          <v-tooltip location="top" max-width="400px" :disabled="tooltipDisabled">
            <template v-slot:activator="{ on }">
              <v-chip
                v-on="on"
                class="status-tag"
                :class="{ 'cursor-pointer': condition.message }"
                :variant="!isError && 'outlined'"
                :text-color="textColor"
                small
                :color="color">
                <v-icon v-if="chipIcon" size="x-small" start class="chip-icon">{{chipIcon}}</v-icon>
                {{chipText}}
              </v-chip>
            </template>
            <div class="font-weight-bold">{{chipTooltip.title}}</div>
            <div>Status: {{chipTooltip.status}}</div>
            <div v-for="({ shortDescription }) in chipTooltip.userErrorCodeObjects" :key="shortDescription">
              <v-icon class="mr-1" color="white" size="small">mdi-account-alert</v-icon>
              <span class="font-weight-bold text--lighten-2">{{shortDescription}}</span>
            </div>
            <template v-if="chipTooltip.description">
              <v-divider color="white"></v-divider>
              <div>
                {{chipTooltip.description}}
              </div>
            </template>
          </v-tooltip>
        </div>
      </template>
      <template v-slot:card>
        <shoot-message-details
          :status-title="chipStatus"
          :last-message="nonErrorMessage"
          :error-descriptions="errorDescriptions"
          :last-transition-time="condition.lastTransitionTime"
          :secret-binding-name="secretBindingName"
          :namespace="namespace"
        />
      </template>
    </g-popper>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import filter from 'lodash/filter'

import GPopper from '@/components/GPopper.vue'
import ShootMessageDetails from '@/components/ShootMessageDetails.vue'

import { isUserError, objectsFromErrorCodes } from '@/utils/errorCodes'

export default {
  components: {
    GPopper,
    ShootMessageDetails
  },
  props: {
    condition: {
      type: Object,
      required: true
    },
    secretBindingName: {
      type: String
    },
    namespace: {
      type: String
    },
    popperKey: {
      type: String,
      required: true
    },
    popperPlacement: {
      type: String
    },
    staleShoot: {
      type: Boolean
    }
  },
  data () {
    return {
      popperVisible: false
    }
  },
  computed: {
    ...mapGetters([
      'isAdmin'
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
        userErrorCodeObjects: filter(objectsFromErrorCodes(this.condition.codes), { userError: true })
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
            errorCodeObjects: objectsFromErrorCodes(this.condition.codes)
          }
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
        return 'grey'
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
    tooltipDisabled () {
      return this.popperVisible
    }
  },
  methods: {
    onPopperInput (value) {
      this.popperVisible = value
    }
  }
}
</script>

<style lang="scss" scoped>

  .cursor-pointer :deep(.v-chip__content) {
    cursor: pointer;
  }

  .status-tag {
    margin: 1px;
  }

  .status-tag :deep(.v-chip__content) {
    margin: -4px;

    .chip-icon {
      margin-left: -4px;
      margin-right: 1px;
    }
  }
</style>
