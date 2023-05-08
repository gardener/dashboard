<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex align-center justify-start flex-nowrap fill-height auto-hide-wrapper">
    <div class="auto-hide-slot">
      <slot v-if="left"></slot>
    </div>
    <slot name="activator"></slot>
    <div class="auto-hide-slot">
      <slot v-if="right"></slot>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    left: {
      type: Boolean,
      default: false,
    },
    right: {
      type: Boolean,
      default: false,
    },
  },
})
</script>

<style lang="scss" scoped>
  .auto-hide-wrapper {
    &:hover {
      .auto-hide-slot {
        opacity: 1;
        &:after {
          opacity: 0;
        }
      }
    }
    .auto-hide-slot {
      opacity: 0;
    }
  }
</style>
