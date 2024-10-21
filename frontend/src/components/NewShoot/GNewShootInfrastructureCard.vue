<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-hover v-slot="{ isHovering, props }">
    <v-card
      v-bind="props"
      class="cursor-pointer pa-2 ma-3"
      min-width="120"
      hover
      elevation="3"
      :color="color"
      :variant="variant"
      @click.stop="$emit('update:modelValue', true)"
    >
      <div class="d-flex flex-column justify-center align-center">
        <g-vendor-icon
          :icon="infrastructureType"
          :size="60"
          no-background
          :style="getVendorIconStyles(isHovering)"
        />
        <div class="mt-2 text-subtitle-1">
          {{ infrastructureType }}
        </div>
      </div>
    </v-card>
  </v-hover>
</template>

<script>

import GVendorIcon from '@/components/GVendorIcon'

export default {
  components: {
    GVendorIcon,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    infrastructureType: {
      type: String,
      required: true,
    },
  },
  emits: [
    'update:modelValue',
  ],
  computed: {
    color () {
      return this.modelValue ? 'primary' : undefined
    },
    variant () {
      return this.modelValue ? 'outlined' : 'elevated'
    },
  },
  methods: {
    getVendorIconStyles (isHovering) {
      let grayscale = '80%'
      if (isHovering) {
        grayscale = '50%'
      }
      if (this.modelValue) {
        grayscale = '0%'
      }

      return {
        filter: `grayscale(${grayscale})`,
        opacity: this.modelValue || isHovering ? '1' : '0.8',
      }
    },
  },
}
</script>
