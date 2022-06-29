<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip top :disabled="noTooltip">
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
      currentClockTimer: undefined,
      nextClockTimer: undefined,
      negativeRefDate: true
    }
  },
  computed: {
    relDateTimeString () {
      if (this.mode === 'future' && !isValidTerminationDate(this.dateTime)) {
        return this.expiredText
      }
      let relDateTimeString = ''
      if (this.dateTime && this.currentClockTimer) {
        if (this.negativeRefDate) {
          relDateTimeString = getTimeStringFrom(new Date(this.dateTime), new Date(Math.max(new Date(this.dateTime), this.currentClockTimer.dateObj)), this.withoutPrefixOrSuffix)
        } else {
          relDateTimeString = getTimeStringTo(new Date(Math.min(new Date(this.dateTime), this.currentClockTimer.dateObj)), new Date(this.dateTime), this.withoutPrefixOrSuffix)
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
