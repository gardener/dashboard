<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <span>
    {{timeAgo}}
  </span>
</template>

<script>
  import {getTimeAgoFrom} from '@/utils'
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
    props: ['dateTime'],
    data () {
      return {
        currentClockTimer: undefined,
        nextClockTimer: undefined
      }
    },
    computed: {
      timeAgo () {
        if (this.dateTime && this.currentClockTimer) {
          return getTimeAgoFrom(this.dateTime, new Date(Math.max(new Date(this.dateTime), this.currentClockTimer.dateObj)))
        } else {
          return ''
        }
      }
    },
    methods: {
      updateClockInstance (dateTimeValue) {
        const diffInMilliseconds = new Date() - new Date(dateTimeValue)

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
