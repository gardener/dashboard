<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row>
    <v-col class="regularInput">
      <v-text-field
        color="primary"
        label="Maintenance Start Time"
        v-model="maintenanceBegin"
        :error-messages="getErrorMessages('maintenanceBegin')"
        @input="onInputmaintenanceBegin"
        @blur="$v.maintenanceBegin.$touch()"
        type="time"
        persistent-hint
        hint="Provide start of maintenance time window in which Gardener may schedule automated cluster updates."
      ></v-text-field>
    </v-col>
    <v-col class="regularInput">
      <v-autocomplete
        color="primary"
        label="Timezone"
        :items="timezones"
        v-model="selectedTimezone"
        >
      </v-autocomplete>
    </v-col>
  </v-row>
</template>

<script>
import { getValidationErrors } from '@/utils'
import { getTimezone, timezones, randomMaintenanceBegin, getMaintenanceWindow, parseTimeWithOffset } from '@/utils/time'
import { required } from 'vuelidate/lib/validators'

const validationErrors = {
  maintenanceBegin: {
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
  validations: {
    maintenanceBegin: {
      required
    }
  },
  data () {
    return {
      selectedTimezone: getTimezone(),
      timezones,
      validationErrors,
      maintenanceBegin: undefined,
      valid: undefined
    }
  },
  methods: {
    getMaintenanceWindow () {
      return getMaintenanceWindow(this.maintenanceBegin, this.selectedTimezone)
    },
    reset () {
      this.selectedTimezone = getTimezone()
      if (!this.timeWindowBegin) {
        this.setDefaultMaintenanceTimeWindow()
      } else {
        this.setBeginTime(this.timeWindowBegin)
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
    setBeginTime (time) {
      const parsedTime = parseTimeWithOffset(time)
      if (parsedTime) {
        const newTimeWindowBegin = `${parsedTime.timeHour}:${parsedTime.timeMinute}`
        if (newTimeWindowBegin !== this.maintenanceBegin || parsedTime.timezone !== this.selectedTimezone) {
          // Only set if value actually changed in parent component
          // Vue component would reset input focus otherwise
          this.maintenanceBegin = newTimeWindowBegin
          this.selectedTimezone = parsedTime.timezone
        }
      }
    },
    setDefaultMaintenanceTimeWindow () {
      this.maintenanceBegin = randomMaintenanceBegin()
    },
    onInputmaintenanceBegin () {
      this.$v.maintenanceBegin.$touch()
      this.validateInput()
    }
  },
  watch: {
    timeWindowBegin (time) {
      this.setBeginTime(time)
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
