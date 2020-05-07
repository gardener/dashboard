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
  <v-row>
    <v-col class="regularInput">
      <v-text-field
        color="cyan darken-2"
        label="Maintenance Start Time"
        v-model="localizedMaintenanceBegin"
        :error-messages="getErrorMessages('localizedMaintenanceBegin')"
        @input="onInputLocalizedMaintenanceBegin"
        @blur="$v.localizedMaintenanceBegin.$touch()"
        type="time"
        persistent-hint
        hint="Provide start of maintenance time window in which Gardener may schedule automated cluster updates."
      ></v-text-field>
    </v-col>
    <v-col class="regularInput">
      <v-autocomplete
        color="cyan darken-2"
        label="Timezone"
        :items="timezones"
        v-model="selectedTimezone"
        >
      </v-autocomplete>
    </v-col>
  </v-row>
</template>

<script>
import moment from 'moment-timezone'
import { mapState } from 'vuex'
import { getValidationErrors, randomLocalMaintenanceBegin, utcMaintenanceWindowFromLocalBegin } from '@/utils'
import { required } from 'vuelidate/lib/validators'

const validationErrors = {
  localizedMaintenanceBegin: {
    required: 'Maintenance start time is required'
  }
}

export default {
  name: 'maintenance-time',
  props: {
    timeWindowBegin: {
      type: String
    }
  },
  computed: {
    ...mapState([
      'localTimezone'
    ])
  },
  validations: {
    localizedMaintenanceBegin: {
      required
    }
  },
  data () {
    return {
      selectedTimezone: this.localTimezone,
      timezones: moment.tz.names(),
      validationErrors,
      localizedMaintenanceBegin: undefined,
      valid: undefined
    }
  },
  methods: {
    getUTCMaintenanceWindow () {
      return utcMaintenanceWindowFromLocalBegin({ localBegin: this.localizedMaintenanceBegin, timezone: this.selectedTimezone })
    },
    reset () {
      this.selectedTimezone = this.localTimezone
      if (!this.timeWindowBegin) {
        this.setDefaultMaintenanceTimeWindow()
      } else {
        this.setLocalizedTime(this.timeWindowBegin)
      }
      this.validateInput()
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    validateInput () {
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', this.valid)
      }
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
    },
    setDefaultMaintenanceTimeWindow () {
      this.localizedMaintenanceBegin = randomLocalMaintenanceBegin()
    },
    onInputLocalizedMaintenanceBegin () {
      this.$v.localizedMaintenanceBegin.$touch()
      this.validateInput()
    }
  },
  watch: {
    timeWindowBegin (utcBegin) {
      this.setLocalizedTime(utcBegin)
      this.validateInput()
    }
  },
  mounted () {
    this.reset()
  }
}
</script>

<style lang="scss" scoped>
  .regularInput {
    max-width: 300px;
  }
</style>
