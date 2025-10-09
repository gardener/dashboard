<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list-item :class="{ 'pt-1 pb-1': dense }">
    <template #prepend>
      <v-icon
        v-if="!dense"
        :color="iconColor"
      >
        mdi-key-change
      </v-icon>
    </template>
    <g-list-item-content>
      <div class="d-flex align-center">
        <span
          v-tooltip:top="titleTooltip"
        >{{ title }}</span>
        <v-tooltip location="top">
          <template #activator="{ props }">
            <v-chip
              v-if="showChip"
              v-bind="props"
              :color="phaseColor"
              label
              size="x-small"
              class="ml-2"
              variant="tonal"
            >
              {{ phaseCaption }}
            </v-chip>
          </template>
          <template v-if="phaseType === 'Prepared'">
            <template v-if="phase && phase.incomplete">
              <div>
                <strong>
                  All two-step credential rotations need to be in phase
                  <v-chip
                    color="primary"
                    label
                    size="x-small"
                    class="ml-2"
                  >Prepared</v-chip>
                  in order to perform this operation
                </strong>
              </div>
              <div>Please prepare rotation of the following credentials</div>
              <ul v-if="phase">
                <li
                  v-for="unpreparedRotation in phase.unpreparedRotations"
                  :key="unpreparedRotation.title"
                >
                  {{ unpreparedRotation.title }}
                </li>
              </ul>
            </template>
            <template v-else>
              <div>
                This two-step operation is in phase
                <v-chip
                  color="primary"
                  label
                  size="x-small"
                  class="ml-2"
                >
                  Prepared
                </v-chip>
              </div>
              <div v-if="!!lastInitiationTime">
                Rotation Prepared: <g-time-string
                  :date-time="lastInitiationTime"
                  mode="past"
                  no-tooltip
                />
              </div>
            </template>
          </template>
          <span v-else-if="isProgressing">
            This operation is currently running
          </span>
          <span v-else>{{ phaseCaption }}</span>
        </v-tooltip>
        <g-shoot-messages
          v-if="type === 'certificateAuthorities'"
          :filter="['cacertificatevalidities-constraint']"
          small
        />
      </div>
      <template #description>
        <div class="d-flex align-center">
          <template v-if="type === 'certificateAuthorities' && !isCACertificateValiditiesAcceptable">
            <span class="text-warning">Certificate Authorities will expire in less than one year</span>
          </template>
          <template v-else>
            <span v-if="!!lastCompletionTime">Last Rotated: <g-time-string
              :date-time="lastCompletionTime"
              mode="past"
            /></span>
            <span v-else>Not yet rotated</span>
          </template>
        </div>
      </template>
    </g-list-item-content>
    <template #append>
      <g-shoot-action-rotate-credentials
        v-model="rotateCredentialsDialog"
        :type="type"
        dialog
        button
      />
    </template>
  </g-list-item>
</template>

<script>
import { ref } from 'vue'

import GShootActionRotateCredentials from '@/components/GShootActionRotateCredentials'
import GTimeString from '@/components/GTimeString'
import GShootMessages from '@/components/ShootMessages/GShootMessages'

import { useShootItem } from '@/composables/useShootItem'
import { useShootStatusCredentialRotation } from '@/composables/useShootStatusCredentialRotation'

import get from 'lodash/get'

export default {
  components: {
    GShootActionRotateCredentials,
    GTimeString,
    GShootMessages,
  },
  props: {
    type: {
      type: String,
      required: true,
    },
    dense: {
      type: Boolean,
      required: false,
    },
  },
  setup (props) {
    const rotateCredentialsDialog = ref(false)

    const {
      shootItem,
      isCACertificateValiditiesAcceptable,
    } = useShootItem()

    return {
      rotateCredentialsDialog,
      isCACertificateValiditiesAcceptable,
      ...useShootStatusCredentialRotation(shootItem, {
        type: props.type,
      }),
    }
  },
  computed: {
    isProgressing () {
      return this.phaseType === 'Preparing' || this.phaseType === 'Completing' || this.phaseType === 'Rotating'
    },
    phaseCaption () {
      return get(this.phase, ['caption'], this.phaseType)
    },
    phaseColor () {
      switch (this.phaseType) {
        case 'Prepared':
        case 'Completed':
          return 'primary'
        default:
          return 'info'
      }
    },
    iconColor () {
      if (!this.isCACertificateValiditiesAcceptable) {
        return 'warning'
      }
      return 'primary'
    },
    showChip () {
      return this.phaseType && this.phaseType !== 'Completed'
    },
    title () {
      return this.rotationType?.title
    },
    titleTooltip () {
      return this.rotationType?.twoStep ? 'Two-step rotation' : 'One-step rotation'
    },
  },
}
</script>

<style lang="scss">
.no-padding {
  padding: 0px !important;
}
</style>
