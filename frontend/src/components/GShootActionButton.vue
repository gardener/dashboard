<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template >
  <v-tooltip
    location="top"
    :disabled="tooltipDisabled"
    :text="tooltipText"
    max-width="600px"
  >
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="mergeProps(props, { onClick })"
        variant="text"
        density="default"
        :disabled="isShootMarkedForDeletion || isShootActionsDisabledForPurpose || disabled"
        :loading="loading"
        :prepend-icon="icon"
        :color="color"
        width="100%"
        class="text-none font-weight-regular justify-start"
      >
        {{ text }}
      </v-btn>
    </template>
  </v-tooltip>
</template>

<script>
import { shootItem } from '@/mixins/shootItem'

export default {
  inject: ['mergeProps'],
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
      default: 'mdi-cog-outline',
    },
    loading: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: 'action-button',
    },
    text: {
      type: String,
    },
    tooltip: {
      type: String,
    },
    caption: {
      type: String,
    },
  },
  mixins: [shootItem],
  computed: {
    tooltipText () {
      if (this.tooltip) {
        return this.tooltip
      }
      return this.shootActionToolTip(this.caption)
    },
    tooltipDisabled () {
      return this.text === this.tooltipText
    },
  },
  emits: ['click'],
  methods: {
    onClick (...args) {
      this.$emit('click', ...args)
    },
  },
}
</script>
