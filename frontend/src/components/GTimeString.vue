<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    location="top"
    :disabled="noTooltip"
  >
    <template #activator="{ props: activatorProps }">
      <span
        v-bind="activatorProps"
        :class="contentClass"
      >{{ relDateTimeString }}</span>
    </template>
    {{ dateTimeString }}
  </v-tooltip>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
} from 'vue'

import {
  getTimeStringFrom,
  getTimeStringTo,
  getTimestampFormatted,
  getDateFormatted,
  isValidTerminationDate,
} from '@/utils'

class Clock extends EventTarget {
  constructor (updateInterval) {
    super()
    this.interval = updateInterval
    this.intervalId = undefined
    this.run()
  }

  run () {
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        const event = new Event('tick')
        event.date = new Date()
        this.dispatchEvent(event)
      }, this.interval)
    }
  }
}

const clockSecondsAccuracy = new Clock(1000)
const clockHalfAMinuteAccuracy = new Clock(1000 * 30)
const clockHalfAnHourAccuracy = new Clock(1000 * 60 * 30)

const props = defineProps({
  dateTime: {
    type: String,
  },
  mode: {
    type: String,
  },
  currentString: {
    type: String, // access the datetime string from outside of the component
  },
  withoutPrefixOrSuffix: {
    type: Boolean,
    default: false,
  },
  noTooltip: {
    type: Boolean,
    default: false,
  },
  dateTooltip: {
    type: Boolean,
    default: false,
  },
  contentClass: {
    type: String,
    default: '',
  },
  expiredText: {
    type: String,
    default: 'soon',
  },
})

const clocks = {}
const currentDate = ref(new Date())
const negativeRefDate = ref(true)

const emit = defineEmits(['update:currentString'])

const relDateTimeString = computed(() => {
  if (props.mode === 'future' && !isValidTerminationDate(props.dateTime)) {
    return props.expiredText
  }
  let relDateTimeString = ''
  if (props.dateTime && currentDate.value) {
    if (negativeRefDate.value) {
      relDateTimeString = getTimeStringFrom(
        new Date(props.dateTime),
        new Date(Math.max(new Date(props.dateTime), currentDate.value)),
        props.withoutPrefixOrSuffix,
      )
    } else {
      relDateTimeString = getTimeStringTo(
        new Date(Math.min(new Date(props.dateTime), currentDate.value)),
        new Date(props.dateTime),
        props.withoutPrefixOrSuffix,
      )
    }
  }

  emit('update:currentString', relDateTimeString)
  return relDateTimeString
})

const dateTimeString = computed(() => {
  if (props.dateTooltip) {
    return getDateFormatted(props.dateTime)
  }
  return getTimestampFormatted(props.dateTime)
})

function updateClockInstance (dateTimeValue) {
  const currentDate = Date.now()
  const refDate = new Date(dateTimeValue).getTime()

  const diffInMilliseconds = Math.abs(currentDate - refDate)

  if (props.mode === 'past') {
    negativeRefDate.value = true
  } else if (props.mode === 'future') {
    negativeRefDate.value = false
  } else if (currentDate > refDate) {
    negativeRefDate.value = true
  } else {
    negativeRefDate.value = false
  }

  if (diffInMilliseconds <= 60 * 1000) {
    setClock(clockSecondsAccuracy, clockHalfAMinuteAccuracy)
  } else if (diffInMilliseconds <= 60 * 60 * 1000) {
    setClock(clockHalfAMinuteAccuracy, clockHalfAnHourAccuracy)
  } else {
    setClock(clockHalfAnHourAccuracy, null)
  }
}

function setClock (currentClock, nextClock) {
  clocks.current?.removeEventListener('tick', handleTick)
  clocks.next?.removeEventListener('tick', handleNextTick)
  clocks.current = currentClock
  clocks.next = nextClock
  clocks.current?.addEventListener('tick', handleTick)
  clocks.next?.addEventListener('tick', handleNextTick)
}

function handleTick ({ date }) {
  currentDate.value = date
}

function handleNextTick () {
  updateClockInstance(props.dateTime)
}

onMounted(() => {
  if (props.dateTime) {
    updateClockInstance(props.dateTime)
  }
})

onUnmounted(() => {
  setClock(null, null) // removes event listeners
})

watch(() => props.dateTime, value => {
  if (value) {
    updateClockInstance(value)
  }
})
</script>
