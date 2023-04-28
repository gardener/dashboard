<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div class="alternate-row-background">
      <v-expand-transition
        :appear="animateOnAppear"
        v-for="(scheduleEvent, index) in parsedScheduleEvents"
        :key="scheduleEvent.id"
      >
        <v-row class="list-item pt-2" :key="scheduleEvent.id">
          <hibernation-schedule-event
            ref="scheduleEvents"
            :schedule-event="scheduleEvent"
            @remove-schedule-event="onRemoveSchedule(index)"
            @update-wake-up-time="onUpdateWakeUpTime"
            @update-hibernate-time="onUpdateHibernateTime"
            @update-selected-days="onUpdateSelectedDays"
            @update-location="onUpdateLocation"
            @valid="onScheduleEventValid">
          </hibernation-schedule-event>
        </v-row>
      </v-expand-transition>
      <v-row v-if="!parseError" key="addSchedule" class="list-item pt-2">
        <v-col>
          <v-btn
            size="small"
            @click="addSchedule"
            variant="outlined"
            fab
            icon
            color="primary">
            <v-icon class="text-primary">mdi-plus</v-icon>
          </v-btn>
          <v-btn
            @click="addSchedule"
            variant="text"
            color="primary">
            Add Hibernation Schedule
          </v-btn>
        </v-col>
      </v-row>
    </div>
    <v-row v-show="showNoScheduleCheckbox" key="noSchedule" align="center" class="list-item pt-6">
      <v-col>
        <v-checkbox
          v-model="confirmNoSchedule"
          color="primary"
          class="my-0"
          :label="noScheduleCheckboxLabel"
          hint="Check the box above to avoid getting prompted for setting a hibernation schedule"
          persistent-hint>
        </v-checkbox>
      </v-col>
    </v-row>
    <v-row v-if="parseError" class="pt-2">
      <v-alert type="warning" variant="outlined">
        One or more errors occured while parsing hibernation schedules. Your configuration may still be valid - the Dashboard UI currently only supports basic schedules.<br />
        You probably configured crontab lines for your hibernation schedule manually. Please edit your schedules directly in the cluster specification. You can also delete it there and come back to this screen to configure your schedule via the Dashboard UI.
      </v-alert>
    </v-row>
    <v-row v-if="!isHibernationPossible" class="pt-2">
      <v-col>
        <v-alert type="warning" variant="outlined" :value="!isHibernationPossible && parsedScheduleEvents && parsedScheduleEvents.length > 0">
          <div class="font-weight-bold">Your hibernation schedule may not have any effect:</div>
          {{hibernationPossibleMessage}}
        </v-alert>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import forEach from 'lodash/forEach'
import flatMap from 'lodash/flatMap'
import get from 'lodash/get'
import set from 'lodash/set'
import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'

import HibernationScheduleEvent from '@/components/ShootHibernation/HibernationScheduleEvent.vue'
import { parsedScheduleEventsFromCrontabBlock, crontabFromParsedScheduleEvents } from '@/utils/hibernationSchedule'
import { v4 as uuidv4 } from '@/utils/uuid'

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
      noSchedule: undefined,
      animateOnAppear: false
    }
  },
  computed: {
    ...mapState([
      'cfg',
      'location'
    ]),
    ...mapGetters([
      'purposeRequiresHibernationSchedule'
    ]),
    showNoScheduleCheckbox () {
      return this.purposeRequiresHibernationSchedule(this.purpose) &&
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
          return parsedScheduleEventsFromCrontabBlock(crontabBlock, this.location)
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
        crontabBlock.location = this.location
        const parsedScheduleEvents = parsedScheduleEventsFromCrontabBlock(crontabBlock, this.location)
        forEach(parsedScheduleEvents, parsedScheduleEvent => {
          parsedScheduleEvent.location = this.location
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
      const location = this.location
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
  },
  updated () {
    this.animateOnAppear = true
  }
}
</script>
