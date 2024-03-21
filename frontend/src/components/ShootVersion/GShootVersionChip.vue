<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="internalValue"
    toolbar-title="Kubernetes Version"
    placement="bottom"
  >
    <template #activator="{ props: popoverProps }">
      <v-tooltip
        location="top"
        :text="tooltipText"
      >
        <template #activator="{ props: tooltipProps }">
          <v-chip
            v-bind="mergeProps(popoverProps, tooltipProps)"
            size="small"
            class="cursor-pointer ma-1"
            :variant="!supportedPatchAvailable ? 'tonal' : 'flat'"
            :color="chipColor"
          >
            <v-icon
              v-if="supportedPatchAvailable || supportedUpgradeAvailable"
              icon="mdi-menu-up"
              size="small"
            />
            {{ shootK8sVersion }}
          </v-chip>
        </template>
      </v-tooltip>
    </template>
    <g-list style="min-width: 300px">
      <g-list-item>
        <template #prepend>
          <v-icon
            color="primary"
            icon="mdi-cube-outline"
          />
        </template>
        <g-list-item-content label="Version">
          {{ shootK8sVersion }}
        </g-list-item-content>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon
            :color="classificationColor"
            :icon="classificationIcon"
          />
        </template>
        <g-list-item-content label="Classification">
          {{ kubernetesVersion.classification }}
        </g-list-item-content>
      </g-list-item>
      <template v-if="!!kubernetesVersion.isExpirationWarning">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon
              color="warning"
              icon="mdi-clock-alert-outline"
            />
          </template>
          <g-list-item-content label="Expiration">
            Kubernetes version expires on: {{ kubernetesVersion.expirationDateString }}.
            Kubernetes update will be enforced after that date.
          </g-list-item-content>
        </g-list-item>
      </template>
      <template v-else-if="!!kubernetesVersion.expirationDate">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon
              color="primary"
              icon="mdi-clock-outline"
            />
          </template>
          <g-list-item-content label="Expiration">
            {{ kubernetesVersion.expirationDateString }}
          </g-list-item-content>
        </g-list-item>
      </template>
      <template v-if="supportedPatchAvailable || supportedUpgradeAvailable">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon
              color="primary"
              icon="mdi-information-outline"
            />
          </template>
          <g-list-item-content label="Update Information">
            <div v-if="supportedPatchAvailable">
              Patch is available for this version
            </div>
            <div v-if="supportedUpgradeAvailable">
              Upgrade is available for this version
            </div>
          </g-list-item-content>
        </g-list-item>
      </template>
    </g-list>
  </g-popover>
</template>

<script>
import { mapActions } from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'

import { shootItem } from '@/mixins/shootItem'

import { find } from '@/lodash'

export default {
  mixins: [shootItem],
  inject: [
    'mergeProps',
    'activePopoverKey',
  ],
  emits: [
    'update:modelValue',
  ],
  computed: {
    popoverKey () {
      return `g-shoot-version-chip:${this.shootMetadata.uid}`
    },
    internalValue: {
      get () {
        return this.activePopoverKey === this.popoverKey
      },
      set (value) {
        this.activePopoverKey = value ? this.popoverKey : ''
      },
    },
    supportedPatchAvailable () {
      return !!find(this.availableK8sUpdates?.patch, 'isSupported')
    },
    supportedUpgradeAvailable () {
      return !!find(this.availableK8sUpdates?.minor, 'isSupported')
    },
    availableK8sUpdates () {
      return this.availableKubernetesUpdatesForShoot(this.shootK8sVersion, this.shootCloudProfileName)
    },
    chipColor () {
      return this.kubernetesVersion.isDeprecated ? 'warning' : 'primary'
    },
    kubernetesVersion () {
      const version = find(this.kubernetesVersions(this.shootCloudProfileName), { version: this.shootK8sVersion })
      if (!version) {
        return {}
      }
      return version
    },
    tooltipText () {
      if (this.kubernetesVersion.isDeprecated) {
        return 'Kubernetes version is deprecated'
      }
      if (this.supportedPatchAvailable) {
        return 'Kubernetes patch available'
      }
      if (this.supportedUpgradeAvailable) {
        return 'Kubernetes upgrade available'
      }
      if (this.availableK8sUpdates) {
        return 'Updates available'
      }
      return 'Kubernetes version up to date'
    },
    classificationColor () {
      if (this.kubernetesVersion.isDeprecated) {
        return 'warning'
      }
      if (this.kubernetesVersion.isPreview) {
        return 'info'
      }
      return 'primary'
    },
    classificationIcon () {
      if (this.kubernetesVersion.isDeprecated || this.kubernetesVersion.isPreview) {
        return 'mdi-alert-circle-outline'
      }
      return 'mdi-information-outline'
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'kubernetesVersions',
      'availableKubernetesUpdatesForShoot',
    ]),
  },
}
</script>
