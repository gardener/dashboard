<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="py-0 ma-2">
    <v-row align="center">
      <v-row >
        <v-col class="weekday-select">
          <v-select
          color="cyan darken-2"
          item-color="cyan darken-2"
          v-model="selectedDays"
          ref="selectedDays"
          @blur="touchIfNothingFocused"
          @input="onInputSelectedDays"
          :items="weekdays"
          return-object
          :error-messages="getErrorMessages('selectedDays')"
          chips
          label="Weekdays on which this rule shall be active"
          multiple
          small-chips
          deletable-chips
        ></v-select>
        </v-col>
        <v-col class="time-select">
          <v-text-field
            color="cyan darken-2"
            label="Wake up at"
            v-model="wakeUpTime"
            ref="wakeUpTime"
            @blur="touchIfNothingFocused"
            @input="onInputWakeUpTime"
            :error-messages="getErrorMessages('wakeUpTime')"
            type="time"
          ></v-text-field>
        </v-col>
        <v-col class="time-select">
          <v-text-field
            color="cyan darken-2"
            label="Hibernate at"
            v-model="hibernateTime"
            ref="hibernateTime"
            @blur="touchIfNothingFocused"
            @input="onInputHibernateTime"
            :error-messages="getErrorMessages('hibernateTime')"
            type="time"
          ></v-text-field>
        </v-col>
        <v-col class="timezone-select">
          <v-autocomplete
            color="cyan darken-2"
            label="Timezone"
            :items="timezones"
            v-model="selectedTimezone"
            @input="onInputSelectedTimezone"
            >
          </v-autocomplete>
        </v-col>
      </v-row>
      <v-col class="ml-4">
        <v-btn
          small
          outlined
          icon
          color="grey"
          @click.native.stop="removeScheduleEvent">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { getValidationErrors } from '@/utils'
import { required, requiredIf } from 'vuelidate/lib/validators'
import { mapState } from 'vuex'
import moment from 'moment-timezone'
import join from 'lodash/join'
import split from 'lodash/split'
import get from 'lodash/get'
import map from 'lodash/map'
import find from 'lodash/find'
import isEqual from 'lodash/isEqual'
import sortBy from 'lodash/sortBy'

const validationErrors = {
  selectedDays: {
    required: 'Weekdays is required'
  },
  hibernateTime: {
    required: 'You need to specify at least hibernation or wake up time'
  },
  wakeUpTime: {
    required: 'You need to specify at least hibernation or wake up time'
  },
  selectedTimezone: {
    required: 'Timezone is required'
  }
}

export default {
  name: 'hibernation-schedule-event',
  props: {
    scheduleEvent: {
      type: Object,
      required: true
    }
  },
  validations: {
    selectedDays: {
      required
    },
    hibernateTime: {
      required: requiredIf(function () {
        return !this.wakeUpTime
      })
    },
    wakeUpTime: {
      required: requiredIf(function () {
        return !this.hibernateTime
      })
    },
    selectedTimezone: {
      required
    }
  },
  computed: {
    ...mapState([
      'localTimezone'
    ]),
    id () {
      return this.scheduleEvent.id
    }
  },
  data () {
    return {
      validationErrors,
      timezones: moment.tz.names(),
      selectedTimezone: null,
      wakeUpTime: null,
      hibernateTime: null,
      selectedDays: null,
      valid: undefined,
      weekdays: [
        {
          text: 'Mon',
          value: 1,
          sortValue: 1
        },
        {
          text: 'Tue',
          value: 2,
          sortValue: 2
        },
        {
          text: 'Wed',
          value: 3,
          sortValue: 3
        },
        {
          text: 'Thu',
          value: 4,
          sortValue: 4
        },
        {
          text: 'Fri',
          value: 5,
          sortValue: 5
        },
        {
          text: 'Sat',
          value: 6,
          sortValue: 6
        },
        {
          text: 'Sun',
          value: 0,
          sortValue: 7
        }
      ]
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
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
      this.validateInput()
    },
    getTime ({ hour, minute } = {}) {
      if (hour && minute) {
        const momentObj = moment()
        momentObj.hour(hour)
        momentObj.minute(minute)
        if (momentObj.isValid()) {
          return momentObj.format('HH:mm')
        }
      }
    },
    updateLocation (location) {
      const id = this.id
      this.$emit('updateLocation', { location, id })
      this.validateInput()
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
      this.$emit('updateSelectedDays', { weekdays, id })
      this.validateInput()
    },
    removeScheduleEvent () {
      this.$emit('removeScheduleEvent')
    },
    touchIfNothingFocused () {
      if (!get(this, '$refs.selectedDays.isFocused') &&
          !get(this, '$refs.wakeUpTime.isFocused') &&
          !get(this, '$refs.hibernateTime.isFocused')) {
        this.$v.selectedDays.$touch()
        this.$v.wakeUpTime.$touch()
        this.$v.hibernateTime.$touch()
      }
    },
    onInputSelectedDays () {
      this.$v.selectedDays.$touch()
      this.updateSelectedDays()
    },
    onInputWakeUpTime () {
      this.$v.wakeUpTime.$touch()
      this.updateTime({ eventName: 'updateWakeUpTime', time: this.wakeUpTime })
    },
    onInputHibernateTime () {
      this.$v.wakeUpTime.$touch()
      this.updateTime({ eventName: 'updateHibernateTime', time: this.hibernateTime })
    },
    onInputSelectedTimezone () {
      this.updateLocation(this.selectedTimezone)
    },
    validateInput () {
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', { id: this.id, valid: this.valid })
      }
    }
  },
  mounted () {
    this.selectedTimezone = this.scheduleEvent.location
    this.wakeUpTime = this.getTime(this.scheduleEvent.end)
    this.hibernateTime = this.getTime(this.scheduleEvent.start)
    this.setSelectedDays(this.scheduleEvent)
    this.updateSelectedDays() // trigger sort
  }
}
</script>

<style lang="scss" scoped>
  .weekday-select {
    width: 300px;
  }
  .time-select {
    max-width: 100px;
  }
  .timezone-select {
    max-width: 300px;
  }
</style>
