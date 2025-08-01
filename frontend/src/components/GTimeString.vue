<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span
    v-tooltip="{ text: dateTimeString, location: 'top', disabled: noTooltip }"
    :class="contentClass"
  >
    <span>{{ relDateTimeString }}</span> <!-- A span is necessary to prevent an extra space from being added at the end. -->
  </span>
</template>

<script>
import {
  ref,
  toValue,
} from 'vue'
import { useNow } from '@vueuse/core'

import {
  getTimeStringFrom,
  getTimeStringTo,
  getTimestampFormatted,
  getDateFormatted,
  isValidTerminationDate,
} from '@/utils'

const clockSecondsAccuracy = useNow({
  interval: 1000,
  controls: true,
})
const clockHalfAMinuteAccuracy = useNow({
  interval: 30 * 1000,
  controls: true,
})
const clockHalfAnHourAccuracy = useNow({
  interval: 30 * 60 * 1000,
  controls: true,
})

export default {
  props: {
    dateTime: {
      type: [String, Number, Date],
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
  },
  emits: [
    'update:currentString',
  ],
  setup () {
    const currentClockTime = ref(null)
    const nextClockTime = ref(null)

    function setClock (currentClock, nextClock) {
      currentClockTime.value = currentClock?.now ?? null
      nextClockTime.value = nextClock?.now ?? null
    }

    return {
      currentClockTime,
      nextClockTime,
      setClock,
    }
  },
  data () {
    return {
      negativeRefDate: true,
    }
  },
  computed: {
    nextClockTimeValue () {
      return toValue(this.nextClockTime)
    },
    relDateTimeString () {
      if (this.mode === 'future' && !isValidTerminationDate(this.dateTime)) {
        return this.expiredText
      }

      let relDateTimeString = ''
      const currentTime = toValue(this.currentClockTime)
      if (this.dateTime && currentTime) {
        const time = new Date(this.dateTime)
        if (this.negativeRefDate) {
          relDateTimeString = getTimeStringFrom(time, Math.max(time, currentTime), this.withoutPrefixOrSuffix)
        } else {
          relDateTimeString = getTimeStringTo(Math.min(time, currentTime), time, this.withoutPrefixOrSuffix)
        }
      }

      this.$emit('update:currentString', relDateTimeString)
      return relDateTimeString
    },
    dateTimeString () {
      if (this.dateTooltip) {
        return getDateFormatted(this.dateTime)
      }
      return getTimestampFormatted(this.dateTime)
    },
  },
  watch: {
    dateTime (value) {
      if (value) {
        this.updateClockInstance(value)
      }
    },
    nextClockTimeValue (value) {
      if (value) {
        this.updateClockInstance(this.dateTime)
      }
    },
  },
  mounted () {
    if (this.dateTime) {
      this.updateClockInstance(this.dateTime)
    }
  },
  methods: {
    updateClockInstance (dateTimeValue) {
      const currentDate = new Date().getTime()
      const refDate = new Date(dateTimeValue).getTime()
      let diffInMilliseconds
      if (this.mode === 'past') {
        this.negativeRefDate = true
      } else if (this.mode === 'future') {
        this.negativeRefDate = false
      } else if (currentDate > refDate) {
        this.negativeRefDate = true
      } else {
        this.negativeRefDate = false
      }
      if (this.negativeRefDate) {
        diffInMilliseconds = currentDate - refDate
      } else {
        diffInMilliseconds = refDate - currentDate
      }
      if (diffInMilliseconds <= 1000 * 60) {
        this.setClock(clockSecondsAccuracy, clockHalfAMinuteAccuracy)
      } else if (diffInMilliseconds <= 1000 * 60 * 60) {
        this.setClock(clockHalfAMinuteAccuracy, clockHalfAnHourAccuracy)
      } else {
        this.setClock(clockHalfAnHourAccuracy, null)
      }
    },
  },
}
</script>
