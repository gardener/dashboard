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
      <v-text-field
        color="primary"
        label="Timezone"
        v-model="maintenanceTimezone"
        :error-messages="getErrorMessages('maintenanceTimezone')"
        @input="onInputmaintenanceTimezone"
        @blur="$v.maintenanceTimezone.$touch()"
      ></v-text-field>
    </v-col>
  </v-row>
</template>

<script>
import { mapState } from 'vuex'
import { getValidationErrors, randomMaintenanceBegin, maintenanceWindowWithBeginAndTimezone, maintenanceTimeWithTimezoneRegex } from '@/utils'
import { required } from 'vuelidate/lib/validators'
import { isTimezone } from '@/utils/validators'

const validationErrors = {
  maintenanceBegin: {
    required: 'Maintenance start time is required'
  },
  maintenanceTimezone: {
    required: 'Timezone is required',
    isTimezone: 'TimeZone needs to have format [+|-]HH:mm'
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
      'timezone'
    ])
  },
  validations: {
    maintenanceBegin: {
      required
    },
    maintenanceTimezone: {
      required,
      isTimezone
    }
  },
  data () {
    return {
      maintenanceTimezone: this.timezone,
      validationErrors,
      maintenanceBegin: undefined,
      valid: undefined
    }
  },
  methods: {
    getMaintenanceWindow () {
      return maintenanceWindowWithBeginAndTimezone(this.maintenanceBegin, this.maintenanceTimezone)
    },
    reset () {
      if (!this.timeWindowBegin) {
        this.setDefaultMaintenanceTimeWindow()
      } else {
        this.setBeginTimeAndTimezone(this.timeWindowBegin)
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
    setBeginTimeAndTimezone (windowBegin) {
      if (!maintenanceTimeWithTimezoneRegex.test(windowBegin)) {
        return undefined
      }
      const [, timeHours, timeMinutes, offsetSign, offsetHours, offsetMinutes] = maintenanceTimeWithTimezoneRegex.exec(windowBegin)
      this.maintenanceBegin = `${timeHours}:${timeMinutes}`
      this.maintenanceTimezone = `${offsetSign}${offsetHours}:${offsetMinutes}`
    },
    setDefaultMaintenanceTimeWindow () {
      this.maintenanceBegin = randomMaintenanceBegin()
      this.maintenanceTimezone = this.timezone
    },
    onInputmaintenanceBegin () {
      this.$v.maintenanceBegin.$touch()
      this.validateInput()
    },
    onInputmaintenanceTimezone () {
      this.$v.maintenanceTimezone.$touch()
      this.validateInput()
    }
  },
  watch: {
    timeWindowBegin (windowBegin) {
      this.setBeginTimeAndTimezone(windowBegin)
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
