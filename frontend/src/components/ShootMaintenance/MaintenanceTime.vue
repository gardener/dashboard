<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
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
