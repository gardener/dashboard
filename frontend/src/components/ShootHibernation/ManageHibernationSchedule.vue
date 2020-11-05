<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <transition-group name="list">
      <v-row v-for="(scheduleEvent, index) in parsedScheduleEvents" :key="scheduleEvent.id"  class="list-item pt-2" :class="{ 'grey lighten-5': index % 2 }">
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
      </v-row>
      <v-row v-if="!parseError" key="addSchedule" class="list-item">
        <v-col>
          <v-btn
            small
            @click="addSchedule"
            outlined
            fab
            icon
            color="cyan darken-2">
            <v-icon class="cyan--text text--darken-2">mdi-plus</v-icon>
          </v-btn>
          <v-btn
            @click="addSchedule"
            text
            color="cyan darken-2">
            Add Hibernation Schedule
          </v-btn>
        </v-col>
      </v-row>
    </transition-group>
    <v-row v-show="showNoScheduleCheckbox" key="noSchedule" align="center" class="list-item pt-6">
      <v-col>
        <v-checkbox
          v-model="confirmNoSchedule"
          color="cyan darken-2"
          class="my-0"
          :label="noScheduleCheckboxLabel"
          hint="Check the box above to avoid getting prompted for setting a hibernation schedule"
          persistent-hint>
        </v-checkbox>
      </v-col>
    </v-row>
    <v-row v-if="parseError" class="pt-2">
      <v-alert type="warning" outlined>
        One or more errors occured while parsing hibernation schedules. Your configuration may still be valid - the Dashboard UI currently only supports basic schedules.<br />
        You probably configured crontab lines for your hibernation schedule manually. Please edit your schedules directly in the cluster specification. You can also delete it there and come back to this screen to configure your schedule via the Dashboard UI.
      </v-alert>
    </v-row>
    <v-row v-if="!isHibernationPossible" class="pt-2">
      <v-col>
        <v-alert type="warning" outlined>
          <div class="font-weight-bold">Your hibernation schedule may not have any effect:</div>
          <div>{{hibernationPossibleMessage}}</div>
        </v-alert>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import forEach from 'lodash/forEach'
import flatMap from 'lodash/flatMap'
import get from 'lodash/get'
import set from 'lodash/set'
import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'

import HibernationScheduleEvent from '@/components/ShootHibernation/HibernationScheduleEvent'

import { purposeRequiresHibernationSchedule } from '@/utils'
import { parsedScheduleEventsFromCrontabBlock, crontabFromParsedScheduleEvents } from '@/utils/hibernationSchedule'
const { v4: uuidv4 } = require('uuid')

export default {
  name: 'hibernation-schedule',
  components: {
    HibernationScheduleEvent
  },
  props: {
    userInterActionBus: {
      type: Object
    },
    isHibernationPossible: {
      type: Boolean,
      default: true
    },
    hibernationPossibleMessage: {
      type: String
    }
  },
  data () {
    return {
      parsedScheduleEvents: undefined,
      parseError: false,
      valid: true,
      confirmNoSchedule: false,
      scheduleCrontab: undefined,
      purpose: undefined,
      noSchedule: undefined
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
    parseSchedules (scheduleCrontab) {
      try {
        this.parseError = false
        const parsedScheduleEvents = flatMap(scheduleCrontab, crontabBlock => {
          return parsedScheduleEventsFromCrontabBlock(crontabBlock)
        })
        this.setParsedSchedules(parsedScheduleEvents)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(error)
        this.parseError = true
      }
    },
    setDefaultHibernationSchedule () {
      const defaultHibernationCrontab = get(this.cfg.defaultHibernationSchedule, this.purpose)
      this.parseError = false
      const parsedScheduleEvents = flatMap(defaultHibernationCrontab, crontabBlock => {
        crontabBlock.location = this.localTimezone
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
    setNoHibernationSchedule (noSchedule) {
      this.confirmNoSchedule = noSchedule
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
    },
    setScheduleData ({ hibernationSchedule, noHibernationSchedule, purpose }) {
      this.purpose = purpose
      this.parseSchedules(hibernationSchedule)
      this.setNoHibernationSchedule(noHibernationSchedule)
    }
  },
  mounted () {
    if (this.userInterActionBus) {
      this.userInterActionBus.on('updatePurpose', purpose => {
        this.purpose = purpose
        this.setDefaultHibernationSchedule()
      })
    }
  }
}
</script>
