<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span>{{timeString}}</span>
</template>

<script>
import { getTimeStringFrom, getTimeStringTo } from '@/utils'
import Vue from 'vue'

class Clock {
  constructor (updateInterval) {
    this.interval = updateInterval
    this.dateObj = new Date()
    this.intervalId = undefined
    this.run()
  }

  run () {
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        this.dateObj = new Date()
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
    }
  },
  data () {
    return {
      currentClockTimer: undefined,
      nextClockTimer: undefined,
      negativeRefDate: true
    }
  },
  computed: {
    timeString () {
      let timeString = ''
      if (this.dateTime && this.currentClockTimer) {
        if (this.negativeRefDate) {
          timeString = getTimeStringFrom(new Date(this.dateTime), new Date(Math.max(new Date(this.dateTime), this.currentClockTimer.dateObj)), this.withoutPrefixOrSuffix)
        } else {
          timeString = getTimeStringTo(new Date(Math.min(new Date(this.dateTime), this.currentClockTimer.dateObj)), new Date(this.dateTime), this.withoutPrefixOrSuffix)
        }
      }

      this.$emit('update:currentString', timeString)
      return timeString
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
    setClock (currentTimer, nextTimer) {
      Vue.set(this, 'currentClockTimer', currentTimer)
      Vue.set(this, 'nextClockTimer', nextTimer)
    }
  },
  mounted () {
    if (this.dateTime) {
      this.updateClockInstance(this.dateTime)
    }
  },
  watch: {
    dateTime (dateTimeValue) {
      if (dateTimeValue) {
        this.updateClockInstance(dateTimeValue)
      }
    },
    'nextClockTimer.dateObj': {
      handler: function (newValue) {
        if (newValue) {
          this.updateClockInstance(this.dateTime)
        }
      }
    }
  }
}
</script>
