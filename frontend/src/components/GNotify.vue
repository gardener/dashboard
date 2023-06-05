<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <notifications
    :group="group"
    :width="width"
    :position="position"
    :duration="props.duration"
    class="ma-2"
  >
    <template #body="{ item, close }">
      <v-alert
        :density="props.density"
        :variant="props.variant"
        :color="item.type"
        :title="item.title"
        :text="item.text"
        @click:close="close"
        closable
        class="mt-2"
      ></v-alert>
    </template>
  </notifications>
</template>

<script setup>
import { inject, watch, toRef, toRefs } from 'vue'
import { useAppStore } from '@/store'

const store = useAppStore()
const notify = inject('notify')
const alert = toRef(store, 'alert')

// props
const props = defineProps({
  group: {
    type: String,
    default: 'default',
  },
  width: {
    type: String,
    default: '360px',
  },
  position: {
    type: String,
    default: 'bottom right',
  },
  duration: {
    type: Number,
    default: 5000,
  },
  density: {
    type: String,
    default: 'compact',
  },
  variant: {
    type: String,
    default: 'flat',
  },
})

const { group, width, position } = toRefs(props)

function getType (value) {
  if (value.type === 'warn') {
    return 'warning'
  }
  if (['success', 'info', 'warning', 'error'].includes(value.type)) {
    return value.type
  }
  return 'secondary'
}

// watches
watch(alert, value => {
  if (value) {
    const type = getType(value)
    const duration = type === 'success'
      ? 3000
      : props.duration
    notify({
      group: props.group,
      type: getType(value),
      title: value.title,
      text: value.message,
      duration,
    })
    alert.value = null
  }
})
</script>
