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
import { computed, onMounted, onUpdated, watch, toRefs, ref } from 'vue'
import get from 'lodash/get'
import { useTheme } from 'vuetify'

const root = ref(null)

const vTheme = useTheme()

const props = defineProps({
  hintColor: {
    type: String,
  },
})

const { hintColor } = toRefs(props)

const isSelectErrorColor = computed(() => {
  const color = get(root.value, '$children[0].$children[0].color')
  return color === 'error'
})

watch(hintColor, hintColor => {
  applyHintColor()
})

function applyHintColor () {
  if (!root.value) {
    return
  }
  const hintElement = root.value.querySelector('.v-messages__message')
  if (!hintElement) {
    return
  }

  const colorCode = vTheme.current.value.colors[hintColor.value]
  if (!isSelectErrorColor.value && hintColor.value !== 'default') {
    hintElement.style = `color: ${colorCode}`
  } else {
    hintElement.style = ''
  }
}

onMounted(() => {
  applyHintColor()
})

onUpdated(() => {
  applyHintColor()
})

</script>
