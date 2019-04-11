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
          @updateLocation="onUpdateLocation"
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
import flatMap from 'lodash/flatMap'
import get from 'lodash/get'
import set from 'lodash/set'
import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'
import { purposeRequiresHibernationSchedule } from '@/utils'
import { parsedScheduleEventsFromCrontabBlock, crontabFromParsedScheduleEvents } from '@/utils/hibernationSchedule'
import { mapState } from 'vuex'
const uuidv4 = require('uuid/v4')

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
    parseSchedules (scheduleCrontab) {
      try {
        this.parseError = false
        const parsedScheduleEvents = flatMap(scheduleCrontab, crontabBlock => {
          return parsedScheduleEventsFromCrontabBlock(crontabBlock)
        })
        this.setParsedSchedules(parsedScheduleEvents)
      } catch (error) {
        console.warn(error)
        this.parseError = true
      }
    },
    setDefaultHibernationSchedule () {
      const defaultHibernationCrontab = get(this.cfg.defaultHibernationSchedule, this.purpose)
      this.parseError = false
      const parsedScheduleEvents = flatMap(defaultHibernationCrontab, crontabBlock => {
        const parsedScheduleEvents = parsedScheduleEventsFromCrontabBlock(crontabBlock)
        forEach(parsedScheduleEvents, parsedScheduleEvent => {
          parsedScheduleEvent.location = this.localTimezone
        })
        return parsedScheduleEvents
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
      const location = this.localTimezone
      const valid = false
      this.parsedScheduleEvents.push({ start, end, location, id, valid })
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
    onUpdateWakeUpTime ({ hour, minute, id }) {
      const schedule = find(this.parsedScheduleEvents, { id })
      set(schedule, 'end.hour', hour)
      set(schedule, 'end.minute', minute)
      this.ensureScheduleWeekdaysIsSet(schedule, 'end.weekdays', 'start.weekdays')
    },
    onUpdateHibernateTime ({ hour, minute, id }) {
      const schedule = find(this.parsedScheduleEvents, { id })
      set(schedule, 'start.hour', hour)
      set(schedule, 'start.minute', minute)
      this.ensureScheduleWeekdaysIsSet(schedule, 'start.weekdays', 'end.weekdays')
    },
    onUpdateLocation ({ location, id }) {
      const schedule = find(this.parsedScheduleEvents, { id })
      set(schedule, 'location', location)
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
        const { scheduleCrontab, valid } = crontabFromParsedScheduleEvents(this.parsedScheduleEvents)
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
