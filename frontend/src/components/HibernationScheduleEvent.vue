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
    <v-flex xs5 class="mr-3">
      <v-select
      color="cyan darken-2"
      v-model="selectedDays"
      :items="weekdays"
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
        label="Wake up Cluster at"
        v-model="localizedWakeUpTime"
        :error-messages="getErrorMessages('localizedWakeUpTime')"
        type="time"
        clearable
      ></v-text-field>
    </v-flex>
    <v-flex xs2 class="mr-3">
      <v-text-field
        color="cyan darken-2"
        label="Hibernate Cluster at"
        v-model="localizedHibernateTime"
        :error-messages="getErrorMessages('localizedHibernateTime')"
        type="time"
        clearable
      ></v-text-field>
    </v-flex>
    <v-flex xs2 class="mr-3">
      <v-autocomplete
        color="cyan darken-2"
        label="Timezone"
        :items="timezones"
        v-model="selectedTimezone"
        >
      </v-autocomplete>
    </v-flex>
    <v-flex xs1 class="mr-3">
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
import { getValidationErrors } from '@/utils'
import { required, requiredIf } from 'vuelidate/lib/validators'
import moment from 'moment-timezone'
import join from 'lodash/join'
import split from 'lodash/split'
import get from 'lodash/get'
import padStart from 'lodash/padStart'
import map from 'lodash/map'
import find from 'lodash/find'
import isEqual from 'lodash/isEqual'

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
    id () {
      return this.scheduleEvent.id
    }
  },
  data () {
    return {
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
      ],
      validationErrors,
      timezones: moment.tz.names(),
      selectedTimezone: moment.tz.guess(),
      localizedWakeUpTime: null,
      localizedHibernateTime: null,
      selectedDays: null
    }
  },
  methods: {
    reset () {
      this.selectedTimezone = moment.tz.guess()
      this.setLocalizedWakeUpTime(this.scheduleEvent.start)
      this.setLocalizedHibernateTime(this.scheduleEvent.end)
      this.setSelectedDays(this.scheduleEvent)
      this.validateInput()
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    validateInput () {
      this.$v.selectedDays.$touch()
      this.$v.localizedWakeUpTime.$touch()
      this.$v.localizedHibernateTime.$touch()

      const id = this.id
      const valid = !this.$v.$invalid
      this.$emit('valid', { id, valid })
    },
    getLocalizedTime (utcCronTime) {
      if (get(utcCronTime, 'hour') && get(utcCronTime, 'minute')) {
        const momentObj = moment.tz(`${padStart(utcCronTime.hour, 2, '0')}${padStart(utcCronTime.minute, 2, '0')}+0000`, 'HHmmZ', this.selectedTimezone)
        if (momentObj.isValid()) {
          return momentObj.format('HH:mm')
        }
      }
    },
    setLocalizedWakeUpTime (utcCronTime) {
      const localizedTime = this.getLocalizedTime(utcCronTime)
      if (localizedTime && localizedTime !== this.localizedWakeUpTime) {
        // Only set if value actually changed in parent component
        // Vue component would reset input focus otherwise
        this.localizedWakeUpTime = localizedTime
      }
    },
    setLocalizedHibernateTime (utcCronTime) {
      const localizedTime = this.getLocalizedTime(utcCronTime)
      if (localizedTime && localizedTime !== this.localizedHibernateTime) {
        // Only set if value actually changed in parent component
        // Vue component would reset input focus otherwise
        this.localizedHibernateTime = localizedTime
      }
    },
    updateLocalizedTime ({ eventName, localTime, localTimezone }) {
      this.validateInput()

      let utcMoment
      if (localTime && localTimezone) {
        utcMoment = moment.tz(localTime, 'HHmm', localTimezone).utc()
      }

      let utcHour
      let utcMinute
      if (utcMoment && utcMoment.isValid()) {
        utcHour = utcMoment.format('HH')
        utcMinute = utcMoment.format('mm')
      }
      const id = this.id
      this.$emit(eventName, { utcHour, utcMinute, id })
    },
    setSelectedDays (scheduleEvent) {
      const days = get(scheduleEvent, 'start.weekdays', get(scheduleEvent, 'end.weekdays'))
      if (days) {
        const daysArray = map(split(days, ','), day => parseInt(day))
        if (!isEqual(daysArray, this.selectedDays)) {
          this.selectedDays = daysArray
        }
      } else {
        this.selectedDays = null
      }
    },
    updateSelectedDays ({ selectedDays }) {
      this.validateInput()

      let weekdays
      if (selectedDays) {
        const sortedDays = selectedDays.slice()
        sortedDays.sort((a, b) => {
          const aVal = get(find(this.weekdays, { value: a }), 'sortValue')
          const bVal = get(find(this.weekdays, { value: b }), 'sortValue')

          if (aVal > bVal) {
            return 1
          } else if (aVal < bVal) {
            return -1
          }
          return 0
        })
        weekdays = join(sortedDays, ',')
      }
      const id = this.id
      this.$emit('updateSelectedDays', { weekdays, id })
    },
    removeScheduleEvent () {
      this.$emit('removeScheduleEvent')
    }
  },
  watch: {
    scheduleEvent: {
      deep: true,
      handler (newValue, oldValue) {
        this.setLocalizedWakeUpTime(newValue.start)
        this.setLocalizedHibernateTime(newValue.end)
        this.setSelectedDays(newValue)
      }
    },
    localizedWakeUpTime (value) {
      this.updateLocalizedTime({ eventName: 'updateWakeUpTime', localTime: value, localTimezone: this.selectedTimezone })
    },
    localizedHibernateTime (value) {
      this.updateLocalizedTime({ eventName: 'updateHibernateTime', localTime: value, localTimezone: this.selectedTimezone })
    },
    selectedTimezone (value) {
      this.updateLocalizedTime({ eventName: 'updateWakeUpTime', localTime: this.localizedWakeUpTime, localTimezone: value })
      this.updateLocalizedTime({ eventName: 'updateHibernateTime', localTime: this.localizedHibernateTime, localTimezone: value })
    },
    selectedDays (value) {
      this.updateSelectedDays({ selectedDays: value })
    }
  },
  mounted () {
    this.reset()
  }
}
</script>
