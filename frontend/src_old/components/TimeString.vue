<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top" :disabled="noTooltip">
    <template v-slot:activator="{ on }">
      <span v-on="on" :class="contentClass">{{relDateTimeString}}</span>
    </template>
    {{dateTimeString}}
  </v-tooltip>
</template>

<script>
import {
  getTimeStringFrom,
  getTimeStringTo,
  getTimestampFormatted,
  getDateFormatted,
  isValidTerminationDate
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

export default {
  props: {
    dateTime: {
      type: String
    },
    mode: {
      type: String
    },
    currentString: {
      type: String // access the datetime string from outside of the component
    },
    withoutPrefixOrSuffix: {
      type: Boolean,
      default: false
    },
    noTooltip: {
      type: Boolean,
      default: false
    },
    dateTooltip: {
      type: Boolean,
      default: false
    },
    contentClass: {
      type: String,
      default: ''
    },
    expiredText: {
      type: String,
      default: 'soon'
    }
  },
  data () {
    return {
      currentDate: new Date(),
      negativeRefDate: true
    }
  },
  computed: {
    relDateTimeString () {
      if (this.mode === 'future' && !isValidTerminationDate(this.dateTime)) {
        return this.expiredText
      }
      let relDateTimeString = ''
      if (this.dateTime && this.currentDate) {
        if (this.negativeRefDate) {
          relDateTimeString = getTimeStringFrom(
            new Date(this.dateTime),
            new Date(Math.max(new Date(this.dateTime), this.currentDate)),
            this.withoutPrefixOrSuffix
          )
        } else {
          relDateTimeString = getTimeStringTo(
            new Date(Math.min(new Date(this.dateTime), this.currentDate)),
            new Date(this.dateTime),
            this.withoutPrefixOrSuffix
          )
        }
      }

      this.$emit('update:current-string', relDateTimeString)
      return relDateTimeString
    },
    dateTimeString () {
      if (this.dateTooltip) {
        return getDateFormatted(this.dateTime)
      }
      return getTimestampFormatted(this.dateTime)
    }
  },
  methods: {
    updateClockInstance (dateTimeValue) {
      const currentDate = Date.now()
      const refDate = new Date(dateTimeValue).getTime()

      const diffInMilliseconds = Math.abs(currentDate - refDate)

      if (this.mode === 'past') {
        this.negativeRefDate = true
      } else if (this.mode === 'future') {
        this.negativeRefDate = false
      } else if (currentDate > refDate) {
        this.negativeRefDate = true
      } else {
        this.negativeRefDate = false
      }

      if (diffInMilliseconds <= 60 * 1000) {
        this.setClock(clockSecondsAccuracy, clockHalfAMinuteAccuracy)
      } else if (diffInMilliseconds <= 60 * 60 * 1000) {
        this.setClock(clockHalfAMinuteAccuracy, clockHalfAnHourAccuracy)
      } else {
        this.setClock(clockHalfAnHourAccuracy, null)
      }
    },
    setClock (currentClock, nextClock) {
      this.currentClock?.removeEventListener('tick', this.handleTick)
      this.nextClock?.removeEventListener('tick', this.handleNextTick)

      this.currentClock =  currentClock
      this.nextClock = nextClock
      this.currentClock?.addEventListener('tick', this.handleTick)
      this.nextClock?.addEventListener('tick', this.handleNextTick)
    },
    handleTick ({ date }) {
      this.currentDate = date
    },
    handleNextTick () {
      this.updateClockInstance(this.dateTime)
    }
  },
  mounted () {
    if (this.dateTime) {
      this.updateClockInstance(this.dateTime)
    }
  },
  unmounted () {
    this.setClock(null, null) // removes event listeners
  },
  watch: {
    dateTime (dateTimeValue) {
      if (dateTimeValue) {
        this.updateClockInstance(dateTimeValue)
      }
    }
  }
}
</script>
