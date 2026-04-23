<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div :style="{ height: `${footerHeight}px` }">
    <v-divider />
    <div class="v-data-table-footer">
      <div
        class="v-data-table-footer__info"
      >
        {{ itemsLength }} {{ itemsLabel }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { toRefs } from 'vue'

const footerHeight = 37

const props = defineProps({
  itemsLength: {
    type: Number,
    required: true,
  },
  itemsLabel: {
    type: String,
    default: 'Rows',
  },
})

const { itemsLength, itemsLabel } = toRefs(props)

defineExpose({ footerHeight })
</script>
