<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="!workerless">
    <v-row
      v-for="{ name, title, description } in addonDefinitions"
      :key="name"
    >
      <div
        class="d-flex ma-3"
      >
        <div class="action-select">
          <v-checkbox
            :model-value="getAddonEnabled(name)"
            :disabled="getDisabled(name) "
            color="primary"
            density="compact"
            @update:model-value="setAddonEnabled(name, $event)"
          />
        </div>
        <div
          class="d-flex flex-column"
          :class="getTextClass(name)"
        >
          <div class="wrap-text text-subtitle-2">
            {{ title }}
          </div>
          <div class="wrap-text pt-1 text-body-2">
            {{ description }}
          </div>
        </div>
        <v-tooltip
          :disabled="!getDisabled(name)"
          location="top"
          activator="parent"
        >
          <span v-if="getDisabledForbidden(name)">Add-on cannot be disabled</span>
          <span v-if="getDisabledPurpose()">Add-ons are only available if cluster has purpose <code>evaluation</code></span>
        </v-tooltip>
      </div>
    </v-row>
  </div>
</template>

<script setup>
import { useShootContext } from '@/composables/useShootContext'

const props = defineProps({
  createMode: {
    type: Boolean,
    default: false,
  },
})

const {
  addonDefinitions,
  workerless,
  getAddonEnabled,
  setAddonEnabled,
  purpose,
} = useShootContext()

function getDisabledForbidden (name) {
  const { forbidDisable = false } = addonDefinitions.value[name] // eslint-disable-line security/detect-object-injection
  return !props.createMode && forbidDisable && getAddonEnabled(name)
}

function getDisabledPurpose () {
  return purpose.value !== 'evaluation'
}

function getDisabled (name) {
  return getDisabledForbidden(name) || getDisabledPurpose()
}

function getTextClass (name) {
  return getDisabled(name)
    ? 'text-disabled'
    : 'text-medium-emphasis'
}
</script>

<style lang="scss" scoped>
.action-select {
  min-width: 48px;
}
</style>
