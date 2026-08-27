<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span :class="{'font-weight-light text-disabled' : !usedBy}">
    {{ usedByLabel }}
  </span>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'

const props = defineProps({
  usedBy: Number,
})

const usedBy = toRef(props, 'usedBy')

const usedByLabel = computed(() => {
  if (usedBy.value === 0) {
    return 'currently unused'
  } else {
    return `${usedBy.value} ${usedBy.value > 1 ? 'clusters' : 'cluster'}`
  }
})

</script>
