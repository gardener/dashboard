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
    <v-flex xs6 class="mr-3">
      <v-select
      color="cyan darken-2"
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
    </v-flex>
    <v-flex xs2 class="mr-3">
      <v-text-field
        color="cyan darken-2"
        label="Wake up at"
        v-model="localizedWakeUpTime"
        ref="localizedWakeUpTime"
        @blur="touchIfNothingFocused"
        @input="onInputLocalizedWakeUpTime"
        :error-messages="getErrorMessages('localizedWakeUpTime')"
        type="time"
      ></v-text-field>
    </v-flex>
    <v-flex xs2 class="mr-3">
      <v-text-field
        color="cyan darken-2"
        label="Hibernate at"
        v-model="localizedHibernateTime"
        ref="localizedHibernateTime"
        @blur="touchIfNothingFocused"
        @input="onInputLocalizedHibernateTime"
        :error-messages="getErrorMessages('localizedHibernateTime')"
        type="time"
      ></v-text-field>
    </v-flex>
    <v-flex xs3 class="mr-3">
      <v-autocomplete
        color="cyan darken-2"
        label="Timezone"
        :items="timezones"
        v-model="selectedTimezone"
        @input="onInputSelectedTimezone"
        >
      </v-autocomplete>
    </v-flex>
    <v-flex xs1>
      <v-btn
        small
        outline
        icon
        class="grey--text lighten-2"
        @click.native.stop="removeScheduleEvent">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-flex>
  </v-layout>
</template>

<script>
import { getValidationErrors, setDelayedInputFocus } from '@/utils'
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
  localizedHibernateTime: {
    required: 'You need to specify at least hibernation or wake up time'
  },
  localizedWakeUpTime: {
    required: 'You need to specify at least hibernation or wake up time'
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
    localizedHibernateTime: {
      required: requiredIf(function () {
        return !this.localizedWakeUpTime
      })
    },
    localizedWakeUpTime: {
      required: requiredIf(function () {
        return !this.localizedHibernateTime
      })
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
      selectedTimezone: this.localTimezone,
      localizedWakeUpTime: null,
      localizedHibernateTime: null,
      selectedDays: null,
      valid: undefined,
      weekdays: [
        {
          text: 'Monday',
          value: 1,
          sortValue: 1
        },
        {
          text: 'Tuesday',
          value: 2,
          sortValue: 2
        },
        {
          text: 'Wednesday',
          value: 3,
          sortValue: 3
        },
        {
          text: 'Thursday',
          value: 4,
          sortValue: 4
        },
        {
          text: 'Friday',
          value: 5,
          sortValue: 5
        },
        {
          text: 'Saturday',
          value: 6,
          sortValue: 6
        },
        {
          text: 'Sunday',
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
    getLocalizedTime (utcCronTime) {
      if (get(utcCronTime, 'hour') && get(utcCronTime, 'minute')) {
        const utcMoment = moment.utc()
        utcMoment.hour(utcCronTime.hour)
        utcMoment.minute(utcCronTime.minute)
        const localMoment = utcMoment.tz(this.localTimezone)
        if (localMoment.isValid()) {
          return localMoment.format('HH:mm')
        }
      }
    },
    updateLocalizedTime ({ eventName, localTime }) {
      let utcMoment
      if (localTime && this.selectedTimezone) {
        utcMoment = moment.tz(localTime, 'HHmm', this.selectedTimezone).utc()
      }

      let utcHour
      let utcMinute
      if (utcMoment && utcMoment.isValid()) {
        utcHour = utcMoment.format('HH')
        utcMinute = utcMoment.format('mm')
      }
      const id = this.id
      this.$emit(eventName, { utcHour, utcMinute, id })
      this.validateInput()
    },
    setSelectedDays (scheduleEvent) {
      const days = get(scheduleEvent, 'start.weekdays', get(scheduleEvent, 'end.weekdays'))
      if (days) {
        const daysArray = map(split(days, ','), day => find(this.weekdays, { 'value': parseInt(day) }))
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
          !get(this, '$refs.localizedWakeUpTime.isFocused') &&
          !get(this, '$refs.localizedHibernateTime.isFocused')) {
        this.$v.selectedDays.$touch()
        this.$v.localizedWakeUpTime.$touch()
        this.$v.localizedHibernateTime.$touch()
      }
    },
    onInputSelectedDays () {
      this.$v.selectedDays.$touch()
      this.updateSelectedDays()
    },
    onInputLocalizedWakeUpTime () {
      this.$v.localizedWakeUpTime.$touch()
      this.updateLocalizedTime({ eventName: 'updateWakeUpTime', localTime: this.localizedWakeUpTime })
    },
    onInputLocalizedHibernateTime () {
      this.$v.localizedWakeUpTime.$touch()
      this.updateLocalizedTime({ eventName: 'updateHibernateTime', localTime: this.localizedHibernateTime })
    },
    onInputSelectedTimezone () {
      this.updateLocalizedTime({ eventName: 'updateWakeUpTime', localTime: this.localizedWakeUpTime })
      this.updateLocalizedTime({ eventName: 'updateHibernateTime', localTime: this.localizedHibernateTime })
    },
    validateInput () {
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', { id: this.id, valid: this.valid })
      }
    }
  },
  mounted () {
    this.selectedTimezone = this.localTimezone
    this.localizedWakeUpTime = this.getLocalizedTime(this.scheduleEvent.end)
    this.localizedHibernateTime = this.getLocalizedTime(this.scheduleEvent.start)
    this.setSelectedDays(this.scheduleEvent)
    this.updateSelectedDays() // trigger sort

    setDelayedInputFocus(this, 'selectedDays')
  }
}
</script>
