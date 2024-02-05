<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row
    align="center"
    class="ma-0"
  >
    <v-col cols="11">
      <v-row class="ma-0">
        <v-col cols="5">
          <v-select
            ref="selectedDays"
            v-model="selectedDays"
            color="primary"
            item-color="primary"
            :items="weekdays"
            return-object
            :error-messages="getErrorMessages(v$.selectedDays)"
            chips
            label="Weekdays on which this rule shall be active"
            multiple
            closable-chips
            variant="underlined"
            @blur="touchIfNothingFocused"
            @update:model-value="onInputSelectedDays"
          />
        </v-col>
        <v-col cols="2">
          <g-time-text-field
            ref="wakeUpTime"
            v-model="wakeUpTime"
            color="primary"
            label="Wake up at"
            :error-messages="getErrorMessages(v$.wakeUpTime)"
            clearable
            variant="underlined"
            @blur="touchIfNothingFocused"
            @update:model-value="onInputWakeUpTime"
          />
        </v-col>
        <v-col cols="2">
          <g-time-text-field
            ref="hibernateTime"
            v-model="hibernateTime"
            color="primary"
            label="Hibernate at"
            :error-messages="getErrorMessages(v$.hibernateTime)"
            clearable
            variant="underlined"
            @blur="touchIfNothingFocused"
            @update:model-value="onInputHibernateTime"
          />
        </v-col>
        <v-col cols="3">
          <v-autocomplete
            v-model="selectedLocation"
            color="primary"
            label="Location"
            :items="locations"
            append-icon="mdi-map-marker-outline"
            variant="underlined"
            @update:model-value="onInputSelectedLocation"
          />
        </v-col>
      </v-row>
    </v-col>
    <v-col cols="1">
      <v-btn
        size="x-small"
        variant="tonal"
        icon="mdi-close"
        color="grey"
        @click.stop="removeScheduleEvent"
      />
    </v-col>
  </v-row>
</template>

<script>
import {
  required,
  requiredIf,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import GTimeTextField from '@/components/GTimeTextField.vue'

import {
  withMessage,
  withFieldName,
} from '@/utils/validators'
import { getErrorMessages } from '@/utils'
import moment from '@/utils/moment'

import {
  join,
  split,
  get,
  map,
  find,
  isEqual,
  sortBy,
} from '@/lodash'

export default {
  components: {
    GTimeTextField,
  },
  props: {
    scheduleEvent: {
      type: Object,
      required: true,
    },
  },
  emits: [
    'update-location',
    'update-selected-days',
    'remove-schedule-event',
    'update-wake-up-time',
    'update-hibernate-time',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  validations () {
    const rules = {
      selectedDays: withFieldName('Hibernation Selected Days', {
        required,
      }),
      selectedLocation: withFieldName('Hibernation Location', {
        required,
      }),
    }

    const hibernateTimeRules = {
      required: withMessage('You need to specify at least hibernation or wake up time',
        requiredIf(() => !this.wakeUpTime),
      ),
    }
    rules.hibernateTime = withFieldName('Hibernation Time', hibernateTimeRules)

    const wakeUpTimeRules = {
      required: withMessage('You need to specify at least hibernation or wake up time',
        requiredIf(() => !this.hibernateTime),
      ),
    }
    rules.wakeUpTime = withFieldName('Hibernation Wake Up Time', wakeUpTimeRules)

    return rules
  },
  data () {
    return {
      locations: moment.tz.names(),
      selectedLocation: null,
      wakeUpTime: null,
      hibernateTime: null,
      selectedDays: null,
      weekdays: [
        {
          title: 'Mon',
          value: 1,
          sortValue: 1,
        },
        {
          title: 'Tue',
          value: 2,
          sortValue: 2,
        },
        {
          title: 'Wed',
          value: 3,
          sortValue: 3,
        },
        {
          title: 'Thu',
          value: 4,
          sortValue: 4,
        },
        {
          title: 'Fri',
          value: 5,
          sortValue: 5,
        },
        {
          title: 'Sat',
          value: 6,
          sortValue: 6,
        },
        {
          title: 'Sun',
          value: 0,
          sortValue: 7,
        },
      ],
    }
  },
  computed: {
    id () {
      return this.scheduleEvent.id
    },
  },
  mounted () {
    this.selectedLocation = this.scheduleEvent.location
    this.wakeUpTime = this.getTime(this.scheduleEvent.end)
    this.hibernateTime = this.getTime(this.scheduleEvent.start)
    this.setSelectedDays(this.scheduleEvent)
    this.updateSelectedDays() // trigger sort
  },
  methods: {
    updateTime ({ eventName, time }) {
      const momentObj = moment(time, 'HHmm')
      let hour
      let minute
      const id = this.id
      if (momentObj.isValid()) {
        hour = momentObj.format('HH')
        minute = momentObj.format('mm')
      }
      this.$emit(eventName, { hour, minute, id })
    },
    getTime ({ hour, minute } = {}) {
      if (hour && minute) {
        const momentObj = moment()
          .hour(hour)
          .minute(minute)
        if (momentObj.isValid()) {
          return momentObj.format('HH:mm')
        }
      }
    },
    updateLocation (location) {
      const id = this.id
      this.$emit('update-location', { location, id })
    },
    setSelectedDays (scheduleEvent) {
      const days = get(scheduleEvent, 'start.weekdays', get(scheduleEvent, 'end.weekdays'))
      if (days) {
        const daysArray = map(split(days, ','), day => find(this.weekdays, { value: parseInt(day) }))
        if (!isEqual(daysArray, this.selectedDays)) {
          this.selectedDays = daysArray
        }
      } else {
        this.selectedDays = null
      }
    },
    updateSelectedDays () {
      let weekdays
      if (this.selectedDays) {
        this.selectedDays = sortBy(this.selectedDays, 'sortValue')
        weekdays = join(map(this.selectedDays, 'value'), ',')
      }
      const id = this.id
      this.$emit('update-selected-days', { weekdays, id })
    },
    removeScheduleEvent () {
      this.$emit('remove-schedule-event')
    },
    touchIfNothingFocused () {
      if (!get(this, '$refs.selectedDays.isFocused') &&
          !get(this, '$refs.wakeUpTime.isFocused') &&
          !get(this, '$refs.hibernateTime.isFocused')) {
        this.v$.selectedDays.$touch()
        this.v$.wakeUpTime.$touch()
        this.v$.hibernateTime.$touch()
      }
    },
    onInputSelectedDays () {
      this.v$.selectedDays.$touch()
      this.updateSelectedDays()
    },
    onInputWakeUpTime () {
      this.v$.wakeUpTime.$touch()
      this.updateTime({ eventName: 'update-wake-up-time', time: this.wakeUpTime })
    },
    onInputHibernateTime () {
      this.v$.wakeUpTime.$touch()
      this.updateTime({ eventName: 'update-hibernate-time', time: this.hibernateTime })
    },
    onInputSelectedLocation () {
      this.updateLocation(this.selectedLocation)
    },
    getErrorMessages,
  },
}
</script>
