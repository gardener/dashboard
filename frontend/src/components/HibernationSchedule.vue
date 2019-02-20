<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-layout>
    <transition-group name="list">
      <v-layout row v-for="(scheduleEvent, index) in parsedScheduleEvents" :key="scheduleEvent.id"  class="list-item pt-2">
        <hibernation-schedule-event
          ref="scheduleEvents"
          :scheduleEvent="scheduleEvent"
          @removeScheduleEvent="onRemoveSchedule(index)"
          @updateWakeUpTime="onUpdateWakeUpTime"
          @updateHibernateTime="onUpdateHibernateTime"
          @updateSelectedDays="onUpdateSelectedDays"
          @valid="onScheduleEventValid">
        </hibernation-schedule-event>
      </v-layout>
      <v-layout row v-if="!parseError" key="addSchedule" class="list-item pt-2">
        <v-flex xs12>
          <v-btn
            small
            @click="addSchedule"
            outline
            fab
            icon
            class="cyan darken-2 mx-0 my-0">
            <v-icon class="cyan--text text--darken-2">add</v-icon>
          </v-btn>
          <v-btn
            @click="addSchedule"
            flat
            class="cyan--text text--darken-2">
            Add Hibernation Schedule
          </v-btn>
        </v-flex>
      </v-layout>
    </transition-group>
    <v-layout row v-show="showNoScheduleCheckbox" key="noSchedule" align-center class="list-item pt-4">
      <v-flex>
        <v-checkbox
          v-model="confirmNoSchedule"
          color="cyan darken-2"
          class="my-0"
          :label="noScheduleCheckboxLabel"
          hint="Check the box above to avoid getting prompted for setting a hibernation schedule"
          persistent-hint>
        </v-checkbox>
      </v-flex>
    </v-layout>
    <v-layout row v-if="parseError" class="pt-2">
      <v-alert :value="true" type="warning">
        One ore more errors occured while parsing hibernation schedules. Your configuration may still be valid - the Dashboard UI currently only supports basic schedules.<br />
        You probably configured crontab lines for your hibernation schedule manually. Please edit your schedules directly in the cluster specification. You can also delete it there and come back to this screen to configure your schedule via the Dashboard UI.
      </v-alert>
    </v-layout>
  </v-layout>
</template>

<script>
import HibernationScheduleEvent from '@/components/HibernationScheduleEvent'
import forEach from 'lodash/forEach'
import get from 'lodash/get'
import set from 'lodash/set'
import find from 'lodash/find'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import isEqual from 'lodash/isEqual'
import { purposeRequiresHibernationSchedule } from '@/utils'
import moment from 'moment-timezone'
import { mapState } from 'vuex'

const scheduleCrontabRegex = /^(?<minute>\d{0,2})\s(?<hour>\d{0,2})\s\*\s\*\s(?<weekdays>[0-6,]+)$/

export default {
  name: 'hibernation-schedule',
  components: {
    HibernationScheduleEvent
  },
  props: {
    schedules: {
      type: Array
    },
    purpose: {
      type: String
    },
    noSchedule: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      parsedScheduleEvents: undefined,
      parseError: false,
      currentID: 0
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    valid () {
      let valid = true
      forEach(this.parsedScheduleEvents, schedule => {
        if (!schedule.valid) {
          valid = false
        }
      })
      this.$emit('valid', valid)

      return valid
    },
    confirmNoSchedule: {
      get () {
        return this.noSchedule
      },
      set (value) {
        if (value) {
          this.clearParsedScheduleEvents()
        }
        this.$emit('updateNoSchedule', value)
      }
    },
    showNoScheduleCheckbox () {
      return purposeRequiresHibernationSchedule(this.purpose) &&
      isEmpty(this.parsedScheduleEvents) &&
      !this.parseError
    },
    noScheduleCheckboxLabel () {
      return `This ${this.purpose} cluster does not need a hibernation schedule`
    }
  },
  methods: {
    reset () {
      this.parseSchedules(this.schedules)

      this.$nextTick(() => {
        forEach(this.$refs.scheduleEvents, (scheduleEventComponent) => {
          scheduleEventComponent.reset()
        })
      })
    },
    clearParsedScheduleEvents () {
      this.currentID = 0 // Schedule Event Ids need to be stable
      this.parsedScheduleEvents = []
    },
    id () {
      this.currentID++
      return this.currentID
    },
    parseSchedules (schedules) {
      this.clearParsedScheduleEvents()

      this.parseError = false
      forEach(schedules, schedule => {
        const cronStart = get(schedule, 'start')
        const cronEnd = get(schedule, 'end')
        const start = get(scheduleCrontabRegex.exec(cronStart), 'groups')
        const end = get(scheduleCrontabRegex.exec(cronEnd), 'groups')

        if (cronStart && !start) {
          console.warn(`Could not parse start crontab line: ${cronStart}`)
          this.parseError = true
        }
        if (cronEnd && !end) {
          console.warn(`Could not parse end crontab line: ${cronEnd}`)
          this.parseError = true
        }
        if (start && end) {
          if (start.weekdays !== end.weekdays) {
            console.warn(`Start weekdays (${start.weekdays}) and end weekdays (${end.weekdays}) do not match. This is currently not supported by the dashboard`)
            this.parseError = true
          }
        }
        const id = this.id()
        const valid = true
        this.parsedScheduleEvents.push({ start, end, id, valid })
      })
      if (this.parseError) {
        this.clearParsedScheduleEvents()
      }
    },
    setScheduleProperty (schedule, name, value) {
      if (get(schedule, name) !== value) {
        set(schedule, name, value)
      }
    },
    ensureScheduleWeekdaysIsSet (schedule, weekdays1, weekdays2) {
      if (!get(schedule, weekdays1)) {
        set(schedule, weekdays1, get(schedule, weekdays2))
      }
    },
    setDefaultHibernationSchedule () {
      const defaultHibernationCrontab = find(this.cfg.defaultHibernationSchedules, ({ purposes }) => includes(purposes, this.purpose))
      const cronStart = get(defaultHibernationCrontab, 'start')
      const cronEnd = get(defaultHibernationCrontab, 'end')
      let start = get(scheduleCrontabRegex.exec(cronStart), 'groups')
      let end = get(scheduleCrontabRegex.exec(cronEnd), 'groups')

      // Convert configured default schedule to local timezone
      let startMoment, endMoment
      if (start) {
        startMoment = moment.tz(start.hour, 'HH', moment.tz.guess()).utc()
        start = {
          hour: startMoment.hours(),
          minute: start.minute,
          weekdays: start.weekdays
        }
      }
      if (end) {
        endMoment = moment.tz(end.hour, 'HH', moment.tz.guess()).utc()
        end = {
          hour: endMoment.hours(),
          minute: end.minute,
          weekdays: end.weekdays
        }
      }
      this.clearParsedScheduleEvents()
      if (start || end) {
        const id = this.id()
        const valid = true
        this.parsedScheduleEvents.push({ start, end, id, valid })
      }
    },
    addSchedule () {
      if (!isEmpty(this.parsedScheduleEvents)) {
        const id = this.id()
        const start = {}
        const end = {}
        const valid = false
        this.parsedScheduleEvents.push({ start, end, id, valid })
      } else {
        this.setDefaultHibernationSchedule()
      }
    },
    onRemoveSchedule (index) {
      this.parsedScheduleEvents.splice(index, 1)
    },
    onUpdateWakeUpTime ({ utcHour, utcMinute, id }) {
      const schedule = find(this.parsedScheduleEvents, { id })
      this.setScheduleProperty(schedule, 'end.hour', utcHour)
      this.setScheduleProperty(schedule, 'end.minute', utcMinute)
      this.ensureScheduleWeekdaysIsSet(schedule, 'end.weekdays', 'start.weekdays')
    },
    onUpdateHibernateTime ({ utcHour, utcMinute, id }) {
      const schedule = find(this.parsedScheduleEvents, { id })
      this.setScheduleProperty(schedule, 'start.hour', utcHour)
      this.setScheduleProperty(schedule, 'start.minute', utcMinute)
      this.ensureScheduleWeekdaysIsSet(schedule, 'start.weekdays', 'end.weekdays')
    },
    onUpdateSelectedDays ({ weekdays, id }) {
      const schedule = find(this.parsedScheduleEvents, { id })
      this.setScheduleProperty(schedule, 'start.weekdays', weekdays)
      this.setScheduleProperty(schedule, 'end.weekdays', weekdays)
    },
    onScheduleEventValid ({ id, valid }) {
      const schedule = find(this.parsedScheduleEvents, { id })
      schedule.valid = valid
    },
    emitScheduleCrontabs () {
      if (this.valid) {
        const crontabFromParsedScheduleEvent = parsedScheduleEvent => {
          if (parsedScheduleEvent && parsedScheduleEvent.hour && parsedScheduleEvent.minute && parsedScheduleEvent.weekdays) {
            return `${parsedScheduleEvent.minute} ${parsedScheduleEvent.hour} * * ${parsedScheduleEvent.weekdays}`
          }
          return null
        }
        const scheduleCrontabs = []
        let valid = true
        forEach(this.parsedScheduleEvents, parsedScheduleEvent => {
          const start = crontabFromParsedScheduleEvent(parsedScheduleEvent.start)
          const end = crontabFromParsedScheduleEvent(parsedScheduleEvent.end)

          const scheduleCrontab = {}
          if (start) {
            scheduleCrontab.start = start
          }
          if (end) {
            scheduleCrontab.end = end
          }
          if (start || end) {
            scheduleCrontabs.push(scheduleCrontab)
          } else {
            valid = false
          }
        })
        if (valid && !this.parseError) {
          this.$emit('updateHibernationSchedules', scheduleCrontabs)
        }
      }
    }
  },
  mounted () {
    this.parseSchedules(this.schedules)
  },
  watch: {
    parsedScheduleEvents: {
      deep: true,
      handler (value, oldValue) {
        if (!isEmpty(value)) {
          this.confirmNoSchedule = false
        }

        this.emitScheduleCrontabs()
      }
    },
    schedules: {
      deep: true,
      handler (value, oldValue) {
        if (!isEqual(value, oldValue)) {
          this.parseSchedules(value)
        }
      }
    },
    purpose (value) {
      if (!purposeRequiresHibernationSchedule(value)) {
        this.confirmNoSchedule = false
      }
    }
  }
}
</script>
