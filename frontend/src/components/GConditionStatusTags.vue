<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap justify-start">
    <template
      v-for="condition in conditions"
      :key="condition.type"
    >
      <slot
        name="condition"
        :condition="condition"
      />
    </template>
  </div>
  <template v-if="showStatusText">
    <div
      v-for="({ description, link }) in errorCodeObjects"
      :key="description"
      class="mt-1"
    >
      <div class="font-weight-bold text-error wrap-text">
        {{ description }}
      </div>
      <div v-if="link">
        <g-external-link
          :url="link.url"
          class="font-weight-bold text-error"
        >
          {{ link.text }}
        </g-external-link>
      </div>
    </div>
  </template>
</template>

<script setup>
import GExternalLink from '@/components/GExternalLink.vue'

defineProps({
  conditions: {
    type: Array,
    required: true,
  },
  errorCodeObjects: {
    type: Array,
    default: () => [],
  },
  showStatusText: {
    type: Boolean,
    default: false,
  },
})
</script>
