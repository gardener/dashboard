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
        closable
        class="mt-2"
        @click:close="close"
      />
    </template>
  </notifications>
</template>

<script setup>
import {
  inject,
  watch,
  toRef,
  toRefs,
  nextTick,
} from 'vue'

import { useAppStore } from '@/store/app'

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

function getDuration (value, type) {
  if (value.duration) {
    return value.duration
  }
  return type === 'success'
    ? 3000
    : props.duration
}

// watches
watch(alert, value => {
  if (value) {
    const type = getType(value)
    const duration = getDuration(value, type)

    const options = {
      group: props.group,
      type,
      title: value.title,
      text: value.message,
      duration,
    }
    alert.value = null
    nextTick(() => notify(options))
  }
}, {
  immediate: true,
})
</script>
