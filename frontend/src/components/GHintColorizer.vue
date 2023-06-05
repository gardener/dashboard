<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div ref="root">
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUpdated, watch } from 'vue'
import get from 'lodash/get'

const getColorCode = inject('getColorCode')

const props = defineProps({
  hintColor: {
    type: String,
  },
})

const root = ref(null)

const isSelectErrorColor = computed(() => {
  const color = get(root.value, '$children[0].$children[0].color')
  return color === 'error'
})

function applyHintColor () {
  if (!root.value) {
    return
  }
  const hintElement = root.value.querySelector('.v-messages__message')
  if (!hintElement) {
    return
  }

  const colorCode = getColorCode(props.hintColor)
  if (!isSelectErrorColor.value && props.hintColor !== 'default') {
    hintElement.style = `color: ${colorCode}`
  } else {
    hintElement.style = ''
  }
}

watch(() => props.hintColor, () => applyHintColor())
onMounted(() => applyHintColor())
onUpdated(() => applyHintColor())

</script>
