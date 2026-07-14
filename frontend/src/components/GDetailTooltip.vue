<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    :activator="activator"
    :location="location"
    :open-delay="openDelay"
    :open-on-hover="openOnHover"
    :disabled="disabled"
    content-class="pa-0"
    :content-props="{ style: { background: 'transparent' } }"
  >
    <template
      v-if="$slots.activator"
      #activator="{ props: activatorProps }"
    >
      <slot
        name="activator"
        :props="activatorProps"
      />
    </template>
    <v-card
      class="detail-tooltip-card"
      :style="{ '--g-detail-tooltip-width': width + 'px' }"
      elevation="12"
    >
      <div class="detail-tooltip-heading">
        {{ title }}
      </div>
      <div class="detail-tooltip-body">
        <slot />
      </div>
      <div
        v-if="$slots.footer"
        class="detail-tooltip-footer text-medium-emphasis"
      >
        <slot name="footer" />
      </div>
    </v-card>
  </v-tooltip>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  activator: {
    type: [String, Object],
  },
  location: {
    type: String,
    default: 'top',
  },
  openDelay: {
    type: Number,
    default: 200,
  },
  openOnHover: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  width: {
    type: Number,
    default: 280,
    validator: value => value > 0,
  },
})
</script>

<style lang="scss" scoped>
  .detail-tooltip-card {
    width: min(var(--g-detail-tooltip-width), calc(100vw - 24px));
  }

  .detail-tooltip-heading {
    font-size: 0.875rem;
    font-weight: 600;
    padding: 12px 16px 4px;
  }

  .detail-tooltip-body {
    display: grid;
    gap: 10px;
    padding: 8px 16px 14px;
  }

  .detail-tooltip-footer {
    border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    font-size: 0.75rem;
    line-height: 1.4;
    margin: 0 16px;
    padding: 10px 0 14px;
  }
</style>
