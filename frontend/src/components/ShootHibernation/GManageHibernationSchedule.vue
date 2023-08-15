<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div class="alternate-row-background">
      <g-expand-transition-group>
        <v-row
          v-for="(scheduleEvent, index) in parsedScheduleEvents"
          :key="scheduleEvent.id"
          class="list-item pt-2"
        >
          <g-hibernation-schedule-event
            ref="scheduleEvents"
            :schedule-event="scheduleEvent"
            @remove-schedule-event="onRemoveSchedule(index)"
            @update-wake-up-time="onUpdateWakeUpTime"
            @update-hibernate-time="onUpdateHibernateTime"
            @update-selected-days="onUpdateSelectedDays"
            @update-location="onUpdateLocation"
          />
        </v-row>
      </g-expand-transition-group>
      <v-row
        v-if="!parseError"
        key="addSchedule"
        class="list-item pt-2"
      >
        <v-col>
          <v-btn
            variant="text"
            color="primary"
            @click="addSchedule"
          >
            <v-icon class="text-primary">
              mdi-plus
            </v-icon>
            <span class="ml-2">Add Hibernation Schedule</span>
          </v-btn>
        </v-col>
      </v-row>
    </div>
    <v-row
      v-show="showNoScheduleCheckbox"
      key="noSchedule"
      align="center"
      class="list-item pt-6"
    >
      <v-col>
        <v-checkbox
          v-model="confirmNoSchedule"
          color="primary"
          class="my-0"
          :label="noScheduleCheckboxLabel"
          hint="Check the box above to avoid getting prompted for setting a hibernation schedule"
          persistent-hint
        />
      </v-col>
    </v-row>
    <v-row
      v-if="parseError"
      class="pt-2"
    >
      <v-alert
        type="warning"
        variant="outlined"
      >
        One or more errors occured while parsing hibernation schedules. Your configuration may still be valid - the Dashboard UI currently only supports basic schedules.<br>
        You probably configured crontab lines for your hibernation schedule manually. Please edit your schedules directly in the cluster specification. You can also delete it there and come back to this screen to configure your schedule via the Dashboard UI.
      </v-alert>
    </v-row>
    <v-row
      v-if="!isHibernationPossible"
      class="pt-2"
    >
      <v-col>
        <v-alert
          type="warning"
          variant="outlined"
          :model-value="!isHibernationPossible && parsedScheduleEvents && parsedScheduleEvents.length > 0"
        >
          <div class="font-weight-bold">
            Your hibernation schedule may not have any effect:
          </div>
          {{ hibernationPossibleMessage }}
        </v-alert>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'
import { useVuelidate } from '@vuelidate/core'

import {
  forEach,
  flatMap,
  get,
  set,
  find,
  isEmpty,
} from '@/utils/lodash'
import GExpandTransitionGroup from '@/components/GExpandTransitionGroup'
import GHibernationScheduleEvent from '@/components/ShootHibernation/GHibernationScheduleEvent'
import {
  parsedScheduleEventsFromCrontabBlock,
  crontabFromParsedScheduleEvents,
} from '@/utils/hibernationSchedule'
import { v4 as uuidv4 } from '@/utils/uuid'
import {
  useAppStore,
  useConfigStore,
} from '@/store'

export default {
  components: {
    GHibernationScheduleEvent,
    GExpandTransitionGroup,
  },
  inject: ['logger'],
  props: {
    userInterActionBus: {
      type: Object,
    },
    isHibernationPossible: {
      type: Boolean,
      default: true,
    },
    hibernationPossibleMessage: {
      type: String,
    },
  },
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      parsedScheduleEvents: undefined,
      parseError: false,
      confirmNoSchedule: false,
      scheduleCrontab: undefined,
      purpose: undefined,
      noSchedule: undefined,
    }
  },
  computed: {
    ...mapState(useAppStore, [
      'location',
    ]),
    ...mapState(useConfigStore, [
      'defaultHibernationSchedule',
    ]),
    showNoScheduleCheckbox () {
      return this.purposeRequiresHibernationSchedule(this.purpose) &&
      isEmpty(this.parsedScheduleEvents) &&
      !this.parseError
    },
    noScheduleCheckboxLabel () {
      const purpose = this.purpose || ''
      return `This ${purpose} cluster does not need a hibernation schedule`
    },
  },
  mounted () {
    if (this.userInterActionBus) {
      this.userInterActionBus.on('updatePurpose', purpose => {
        this.purpose = purpose
        this.setDefaultHibernationSchedule()
      })
    }
  },
  methods: {
    ...mapActions(useConfigStore, [
      'purposeRequiresHibernationSchedule',
    ]),
    parseSchedules (scheduleCrontab) {
      try {
        this.parseError = false
        const parsedScheduleEvents = flatMap(scheduleCrontab, crontabBlock => {
          return parsedScheduleEventsFromCrontabBlock(crontabBlock, this.location)
        })
        this.setParsedSchedules(parsedScheduleEvents)
      } catch (err) {
        this.logger.warn(err.message)
        this.parseError = true
      }
    },
    setDefaultHibernationSchedule () {
      const defaultHibernationCrontab = get(this.defaultHibernationSchedule, this.purpose)
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
    },
    addSchedule () {
      if (!isEmpty(this.parsedScheduleEvents)) {
        this.addEmptySchedule()
      } else {
        if (!isEmpty(get(this.defaultHibernationSchedule, this.purpose))) {
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
      this.parsedScheduleEvents.push({ start, end, location, id })
      this.confirmNoSchedule = false
    },
    onRemoveSchedule (index) {
      this.parsedScheduleEvents.splice(index, 1)
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
    getScheduleCrontab () {
      if (!this.v$.$invalid) {
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
    setScheduleData ({ hibernationSchedule, noHibernationSchedule, purpose }) {
      this.purpose = purpose
      this.parseSchedules(hibernationSchedule)
      this.setNoHibernationSchedule(noHibernationSchedule)
    },
  },
}
</script>
