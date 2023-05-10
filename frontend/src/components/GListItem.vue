<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <div
    role="list-item"
    class="d-flex align-center px-4 py-2 g-list-item"
  >
    <div
      class="d-inline-flex align-self-center align-center justify-center flex-nowrap mr-4 g-list-item__prepend"
    >
      <slot name="prepend"/>
    </div>

    <div
      class="d-block align-self-center align-center flex-grow-1 g-list-item__content "
    >
      <slot/>
    </div>

    <div v-if="slots.append"
      class="d-inline-flex align-self-center flex-nowrap ml-3 g-list-item__append"
    >
      <slot name="append"/>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .g-list-item {
    letter-spacing: normal;
    text-decoration: none;
    position: relative;
    min-height: 48px;

    .g-list-item__prepend {
      height: 40px;
      min-width: 40px;
      width: 40px;
    }

    .g-list-item__content {
      overflow: hidden;
    }
  }
</style>

<script setup>
import { useSlots } from 'vue'
const slots = useSlots()
</script>
