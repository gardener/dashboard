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
  <div>
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
      <v-alert :value="true" type="warning" outline>
        One or more errors occured while parsing hibernation schedules. Your configuration may still be valid - the Dashboard UI currently only supports basic schedules.<br />
        You probably configured crontab lines for your hibernation schedule manually. Please edit your schedules directly in the cluster specification. You can also delete it there and come back to this screen to configure your schedule via the Dashboard UI.
      </v-alert>
    </v-layout>
  </div>
</template>

<script>
import HibernationScheduleEvent from '@/components/HibernationScheduleEvent'
import forEach from 'lodash/forEach'
import map from 'lodash/map'
import get from 'lodash/get'
import set from 'lodash/set'
import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'
import { purposeRequiresHibernationSchedule } from '@/utils'
import moment from 'moment-timezone'
import { mapState } from 'vuex'
const uuidv4 = require('uuid/v4')

const scheduleCrontabRegex = /^(?<minute>\d{0,2})\s(?<hour>\d{0,2})\s\*\s\*\s(?<weekdays>[0-6,]+)$/

export default {
  name: 'hibernation-schedule',
  components: {
    HibernationScheduleEvent
  },
  props: {
    scheduleCrontab: {
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
      valid: true,
      confirmNoSchedule: false
    }
  },
  computed: {
    ...mapState([
      'cfg',
      'localTimezone'
    ]),
    showNoScheduleCheckbox () {
      return purposeRequiresHibernationSchedule(this.purpose) &&
      isEmpty(this.parsedScheduleEvents) &&
      !this.parseError
    },
    noScheduleCheckboxLabel () {
      const purpose = this.purpose || ''
      return `This ${purpose} cluster does not need a hibernation schedule`
    }
  },
  methods: {
    reset () {
      this.parseSchedules(this.scheduleCrontab)
    },
    parsedScheduleEventFromCrontabBlock (crontabBlock) {
      const cronStart = get(crontabBlock, 'start')
      const cronEnd = get(crontabBlock, 'end')
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
      if (!cronStart && !cronEnd) {
        console.warn(`No start or end value in crontab block`)
        this.parseError = true
      }
      if (!this.parseError) {
        const id = uuidv4()
        const valid = true
        return { start, end, id, valid }
      }
      return undefined
    },
    parseSchedules (scheduleCrontab) {
      this.parseError = false
      const parsedScheduleEvents = map(scheduleCrontab, crontabBlock => {
        return this.parsedScheduleEventFromCrontabBlock(crontabBlock)
      })
      this.setParsedSchedules(parsedScheduleEvents)
    },
    setDefaultHibernationSchedule () {
      const convertScheduleEventLineToLocalTimezone = (scheduleEventLine) => {
        if (scheduleEventLine) {
          const localMoment = moment.tz(this.localTimezone)
          localMoment.hour(scheduleEventLine.hour)
          localMoment.minute(scheduleEventLine.minute)
          const utcMoment = localMoment.utc()
          scheduleEventLine.hour = utcMoment.format('HH')
          scheduleEventLine.minute = utcMoment.format('mm')
        }
        return scheduleEventLine
      }

      const defaultHibernationCrontab = get(this.cfg.defaultHibernationSchedule, this.purpose)
      this.parseError = false
      const parsedScheduleEvents = map(defaultHibernationCrontab, crontabBlock => {
        const parsedScheduleEvent = this.parsedScheduleEventFromCrontabBlock(crontabBlock)
        if (parsedScheduleEvent) {
          parsedScheduleEvent.start = convertScheduleEventLineToLocalTimezone(parsedScheduleEvent['start'])
          parsedScheduleEvent.end = convertScheduleEventLineToLocalTimezone(parsedScheduleEvent['end'])
          return parsedScheduleEvent
        }
      })
      this.setParsedSchedules(parsedScheduleEvents)
    },
    setParsedSchedules (parsedScheduleEvents) {
      if (!this.parseError) {
        this.parsedScheduleEvents = parsedScheduleEvents
        if (!isEmpty(this.parsedScheduleEvents)) {
          this.confirmNoSchedule = false
        }
      } else {
        this.parsedScheduleEvents = []
      }
      this.validateInput()
    },
    addSchedule () {
      if (!isEmpty(this.parsedScheduleEvents)) {
        this.addEmptySchedule()
      } else {
        if (!isEmpty(get(this.cfg.defaultHibernationSchedule, this.purpose))) {
          this.setDefaultHibernationSchedule()
        } else {
          this.addEmptySchedule()
        }
      }
    },
    addEmptySchedule () {
      const id = uuidv4()
      const start = {}
      const end = {}
      const valid = false
      this.parsedScheduleEvents.push({ start, end, id, valid })
      this.confirmNoSchedule = false
      this.validateInput()
    },
    onRemoveSchedule (index) {
      this.parsedScheduleEvents.splice(index, 1)
      this.validateInput()
    },
    ensureScheduleWeekdaysIsSet (schedule, weekdays1, weekdays2) {
      if (!get(schedule, weekdays1)) {
        set(schedule, weekdays1, get(schedule, weekdays2))
      }
    },
    onUpdateWakeUpTime ({ utcHour, utcMinute, id }) {
      const schedule = find(this.parsedScheduleEvents, { id })
      set(schedule, 'end.hour', utcHour)
      set(schedule, 'end.minute', utcMinute)
      this.ensureScheduleWeekdaysIsSet(schedule, 'end.weekdays', 'start.weekdays')
    },
    onUpdateHibernateTime ({ utcHour, utcMinute, id }) {
      const schedule = find(this.parsedScheduleEvents, { id })
      set(schedule, 'start.hour', utcHour)
      set(schedule, 'start.minute', utcMinute)
      this.ensureScheduleWeekdaysIsSet(schedule, 'start.weekdays', 'end.weekdays')
    },
    onUpdateSelectedDays ({ weekdays, id }) {
      const schedule = find(this.parsedScheduleEvents, { id })
      set(schedule, 'start.weekdays', weekdays)
      set(schedule, 'end.weekdays', weekdays)
    },
    onScheduleEventValid ({ id, valid }) {
      const schedule = find(this.parsedScheduleEvents, { id })
      schedule.valid = valid

      this.validateInput()
    },
    getScheduleCrontab () {
      if (this.valid) {
        const crontabLineFromParsedScheduleEvent = ({ crontabBlock, parsedScheduleEvent, line }) => {
          const { weekdays, hour, minute } = get(parsedScheduleEvent, line, {})
          if (parsedScheduleEvent && hour && minute && weekdays) {
            return `${minute} ${hour} * * ${weekdays}`
          }
        }
        const crontabBlockFromScheduleEvent = parsedScheduleEvent => {
          const crontabBlock = {}
          const parsedScheduleEventStart = crontabLineFromParsedScheduleEvent({ parsedScheduleEvent, line: 'start' })
          if (parsedScheduleEventStart) {
            crontabBlock.start = parsedScheduleEventStart
          }
          const parsedScheduleEventEnd = crontabLineFromParsedScheduleEvent({ parsedScheduleEvent, line: 'end' })
          if (parsedScheduleEventEnd) {
            crontabBlock.end = parsedScheduleEventEnd
          }
          return crontabBlock
        }
        const scheduleCrontab = []
        let valid = true
        forEach(this.parsedScheduleEvents, parsedScheduleEvent => {
          const crontabBlock = crontabBlockFromScheduleEvent(parsedScheduleEvent)
          if (!isEmpty(crontabBlock)) {
            scheduleCrontab.push(crontabBlock)
          } else {
            valid = false
          }
        })
        if (valid && !this.parseError) {
          return scheduleCrontab
        } else {
          return this.scheduleCrontab
        }
      }
    },
    getNoHibernationSchedule () {
      return this.confirmNoSchedule
    },
    validateInput () {
      let valid = true
      forEach(this.parsedScheduleEvents, schedule => {
        if (!schedule.valid) {
          valid = false
        }
      })

      this.valid = valid && !this.parseError
      this.$emit('valid', this.valid)
    }
  },
  mounted () {
    this.parseSchedules(this.scheduleCrontab)
    this.confirmNoSchedule = this.noSchedule
  }
}
</script>
