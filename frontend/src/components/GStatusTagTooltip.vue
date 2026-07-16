<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-detail-tooltip
    :activator="activator"
    :disabled="disabled"
    :open-delay="750"
    :title="title"
    :width="320"
  >
    <template
      v-if="userErrors.length || description"
      #default
    >
      <template v-if="userErrors.length">
        <div
          v-for="({ shortDescription }) in userErrors"
          :key="shortDescription"
          class="user-error-row"
        >
          <v-icon
            :color="errorColor"
            icon="mdi-account-alert-outline"
            size="small"
          />
          <span>{{ shortDescription }}</span>
        </div>
      </template>
      <div
        v-else
        class="status-description text-medium-emphasis"
      >
        {{ description }}
      </div>
    </template>
    <template
      v-if="description && userErrors.length"
      #footer
    >
      {{ description }}
    </template>
  </g-detail-tooltip>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from 'vuetify'

import GDetailTooltip from '@/components/GDetailTooltip.vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  activator: {
    type: [String, Object],
    default: 'parent',
  },
  userErrors: {
    type: Array,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const theme = useTheme()
const isDark = computed(() => theme.current.value.dark)
const errorColor = computed(() => isDark.value ? 'error-lighten-2' : 'error')
</script>

<style lang="scss" scoped>
  .status-description {
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .user-error-row {
    align-items: start;
    display: grid;
    gap: 10px;
    grid-template-columns: 20px minmax(0, 1fr);
  }
</style>
