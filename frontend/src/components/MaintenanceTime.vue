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
    <v-flex xs3 class="mr-3">
      <v-text-field
        color="cyan darken-2"
        label="Maintenance Start Time"
        v-model="localizedMaintenanceBegin"
        :error-messages="getErrorMessages('timeWindowBegin')"
        type="time"
        persistent-hint
        hint="Provide start of maintenance time window in which Gardener may schedule automated cluster updates."
      ></v-text-field>
    </v-flex>
    <v-flex xs2>
      <v-autocomplete
        color="cyan darken-2"
        label="Timezone"
        :items="timezones"
        v-model="selectedTimezone"
        >
      </v-autocomplete>
    </v-flex>
  </v-layout>
</template>

<script>
import moment from 'moment-timezone'
import { getValidationErrors } from '@/utils'
import { required } from 'vuelidate/lib/validators'

const validationErrors = {
  timeWindowBegin: {
    required: 'Maintenance start time is required'
  }
}

export default {
  name: 'maintenance-time',
  props: {
    timeWindowBegin: {
      type: String,
      default: ''
    }
  },
  validations: {
    timeWindowBegin: {
      required
    }
  },
  data () {
    return {
      selectedTimezone: moment.tz.guess(),
      timezones: moment.tz.names(),
      validationErrors,
      localizedMaintenanceBegin: undefined
    }
  },
  methods: {
    updateMaintenanceWindow ({ localBegin, localTimezone }) {
      let utcMoment
      if (localBegin && localTimezone) {
        utcMoment = moment.tz(localBegin, 'HHmm', localTimezone).utc()
      }

      let utcBegin
      let utcEnd
      if (utcMoment && utcMoment.isValid()) {
        utcBegin = utcMoment.format('HHmm00+0000')
        utcMoment.add(1, 'h')
        utcEnd = utcMoment.format('HHmm00+0000')
      }
      this.$emit('updateMaintenanceWindow', { utcBegin, utcEnd })
    },
    reset () {
      this.selectedTimezone = moment.tz.guess()
      this.validateInput()
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    validateInput () {
      this.$v.timeWindowBegin.$touch()

      this.$emit('valid', !this.$v.$invalid)
    },
    setLocalizedTime (utcTime) {
      const momentObj = moment.tz(utcTime, 'HHmmZ', this.selectedTimezone)
      if (momentObj.isValid()) {
        const newLocalizedTimeWindowBegin = momentObj.format('HH:mm')
        if (newLocalizedTimeWindowBegin !== this.localizedMaintenanceBegin) {
          // Only set if value actually changed in parent component
          // Vue component would reset input focus otherwise
          this.localizedMaintenanceBegin = newLocalizedTimeWindowBegin
        }
      }
    }
  },
  watch: {
    timeWindowBegin (value) {
      this.setLocalizedTime(value)
      this.validateInput()
    },
    localizedMaintenanceBegin (value) {
      this.updateMaintenanceWindow({ localBegin: value, localTimezone: this.selectedTimezone })
    },
    selectedTimezone (value) {
      this.updateMaintenanceWindow({ localBegin: this.localizedMaintenanceBegin, localTimezone: value })
    }
  },
  mounted () {
    this.setLocalizedTime(this.timeWindowBegin)
    this.validateInput()
  }
}
</script>
