<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row align="center" class="ma-0">
    <v-col cols="11">
      <v-row class="ma-0">
        <v-col cols="5">
          <v-select
          color="primary"
          item-color="primary"
          v-model="selectedDays"
          ref="selectedDays"
          @blur="touchIfNothingFocused"
          @update:model-value="onInputSelectedDays"
          :items="weekdays"
          return-object
          :error-messages="getErrorMessages('selectedDays')"
          chips
          label="Weekdays on which this rule shall be active"
          multiple
          small-chips
          closable-chips
        ></v-select>
        </v-col>
        <v-col cols="2">
          <v-text-field
            color="primary"
            label="Wake up at"
            v-model="wakeUpTime"
            ref="wakeUpTime"
            @blur="touchIfNothingFocused"
            @update:model-value="onInputWakeUpTime"
            :error-messages="getErrorMessages('wakeUpTime')"
            type="time"
            clearable
          ></v-text-field>
        </v-col>
        <v-col cols="2">
          <v-text-field
            color="primary"
            label="Hibernate at"
            v-model="hibernateTime"
            ref="hibernateTime"
            @blur="touchIfNothingFocused"
            @update:model-value="onInputHibernateTime"
            :error-messages="getErrorMessages('hibernateTime')"
            type="time"
            clearable
          ></v-text-field>
        </v-col>
        <v-col cols="3">
          <v-autocomplete
            color="primary"
            label="Location"
            :items="locations"
            v-model="selectedLocation"
            @update:model-value="onInputSelectedLocation"
            append-icon="mdi-map-marker-outline"
            >
          </v-autocomplete>
        </v-col>
      </v-row>
    </v-col>
    <v-col cols="1">
      <v-btn
        size="small"
        variant="outlined"
        icon
        color="grey"
        @click.stop="removeScheduleEvent">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-col>
  </v-row>
</template>

<script>
import join from 'lodash/join'
import split from 'lodash/split'
import get from 'lodash/get'
import map from 'lodash/map'
import find from 'lodash/find'
import isEqual from 'lodash/isEqual'
import sortBy from 'lodash/sortBy'
import { required, requiredIf } from 'vuelidate/lib/validators'

import { getValidationErrors } from '@/utils'
import moment from '@/utils/moment'

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
  selectedLocation: {
    required: 'Location is required'
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
    selectedLocation: {
      required
    }
  },
  computed: {
    id () {
      return this.scheduleEvent.id
    }
  },
  data () {
    return {
      validationErrors,
      locations: moment.tz.names(),
      selectedLocation: null,
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
      this.$emit('update-selected-days', { weekdays, id })
      this.validateInput()
    },
    removeScheduleEvent () {
      this.$emit('remove-schedule-event')
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
      this.updateTime({ eventName: 'update-wake-up-time', time: this.wakeUpTime })
    },
    onInputHibernateTime () {
      this.$v.wakeUpTime.$touch()
      this.updateTime({ eventName: 'update-hibernate-time', time: this.hibernateTime })
    },
    onInputSelectedLocation () {
      this.updateLocation(this.selectedLocation)
    },
    validateInput () {
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', { id: this.id, valid: this.valid })
      }
    }
  },
  mounted () {
    this.selectedLocation = this.scheduleEvent.location
    this.wakeUpTime = this.getTime(this.scheduleEvent.end)
    this.hibernateTime = this.getTime(this.scheduleEvent.start)
    this.setSelectedDays(this.scheduleEvent)
    this.updateSelectedDays() // trigger sort
  }
}
</script>
