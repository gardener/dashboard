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
      <v-chip
        v-tooltip:top="tooltipText"
        v-bind="popoverProps"
        size="small"
        class="cursor-pointer ma-1"
        :variant="!shootSupportedPatchAvailable ? 'tonal' : 'flat'"
        :color="chipColor"
      >
        <v-icon
          v-if="shootSupportedPatchAvailable || shootSupportedUpgradeAvailable"
          icon="mdi-menu-up"
          size="small"
        />
        {{ k8sVersion }}
      </v-chip>
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
          {{ k8sVersion }}
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
          {{ shootKubernetesVersionObject.classification }}
        </g-list-item-content>
      </g-list-item>
      <template v-if="!!shootKubernetesVersionObject.isExpirationWarning">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon
              color="warning"
              icon="mdi-clock-alert-outline"
            />
          </template>
          <g-list-item-content label="Expiration">
            Kubernetes version expires
            <g-time-string
              :date-time="shootKubernetesVersionObject.expirationDate"
              mode="future"
              date-tooltip
            />.
            Kubernetes update will be enforced after that date.
          </g-list-item-content>
        </g-list-item>
      </template>
      <template v-else-if="!!shootKubernetesVersionObject.expirationDate">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon
              color="primary"
              icon="mdi-clock-outline"
            />
          </template>
          <g-list-item-content label="Expiration">
            <g-time-string
              :date-time="shootKubernetesVersionObject.expirationDate"
              mode="future"
              date-tooltip
            />
          </g-list-item-content>
        </g-list-item>
      </template>
      <template v-if="shootSupportedPatchAvailable || shootSupportedUpgradeAvailable">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon
              color="primary"
              icon="mdi-information-outline"
            />
          </template>
          <g-list-item-content label="Update Information">
            <div :class="{ 'list-style': shootSupportedPatchAvailable && shootSupportedUpgradeAvailable }">
              <ul>
                <li v-if="shootSupportedPatchAvailable">
                  Patch is available for this version
                </li>
                <li v-if="shootSupportedUpgradeAvailable">
                  Upgrade is available for this version
                </li>
              </ul>
            </div>
          </g-list-item-content>
        </g-list-item>
      </template>
    </g-list>
  </g-popover>
</template>

<script>
import { useShootItem } from '@/composables/useShootItem'

export default {
  inject: [
    'mergeProps',
    'activePopoverKey',
  ],
  setup () {
    const {
      shootMetadata,
      k8sVersion,
      shootSupportedPatchAvailable,
      shootSupportedUpgradeAvailable,
      shootAvailableK8sUpdates,
      shootKubernetesVersionObject,
    } = useShootItem()

    return {
      shootMetadata,
      k8sVersion,
      shootSupportedPatchAvailable,
      shootSupportedUpgradeAvailable,
      shootAvailableK8sUpdates,
      shootKubernetesVersionObject,
    }
  },
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
    chipColor () {
      return this.shootKubernetesVersionObject.isDeprecated ? 'warning' : 'primary'
    },
    tooltipText () {
      if (this.shootKubernetesVersionObject.isDeprecated) {
        return 'Kubernetes version is deprecated'
      }
      if (this.shootSupportedPatchAvailable) {
        return 'Kubernetes patch available'
      }
      if (this.shootSupportedUpgradeAvailable) {
        return 'Kubernetes upgrade available'
      }
      if (this.shootAvailableK8sUpdates) {
        return 'Updates available'
      }
      return 'Kubernetes version up to date'
    },
    classificationColor () {
      if (this.shootKubernetesVersionObject.isDeprecated) {
        return 'warning'
      }
      if (this.shootKubernetesVersionObject.isPreview) {
        return 'info'
      }
      return 'primary'
    },
    classificationIcon () {
      if (this.shootKubernetesVersionObject.isDeprecated || this.shootKubernetesVersionObject.isPreview) {
        return 'mdi-alert-circle-outline'
      }
      return 'mdi-information-outline'
    },
  },
}
</script>

<style lang="scss" scoped>
.list-style {
  ul {
    margin-left: 10px;
  }
  li {
    margin-left: 10px;
  }
}
</style>
