<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row class="my-0">
    <v-col class="regularInput">
      <v-text-field
        v-model="maintenanceBegin"
        color="primary"
        label="Maintenance Start Time"
        :error-messages="getErrorMessages('maintenanceBegin')"
        type="time"
        variant="underlined"
        persistent-hint
        hint="Provide start of maintenance time window in which Gardener may schedule automated cluster updates."
        @input="onInputmaintenanceBegin"
        @blur="v$.maintenanceBegin.$touch()"
      />
    </v-col>
    <v-col class="timezoneInput">
      <v-text-field
        v-model="maintenanceTimezone"
        color="primary"
        label="Timezone"
        :error-messages="getErrorMessages('maintenanceTimezone')"
        variant="underlined"
        @input="onInputmaintenanceTimezone"
        @blur="v$.maintenanceTimezone.$touch()"
      />
    </v-col>
  </v-row>
</template>

<script>
import { mapState } from 'pinia'
import { required } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import {
  getValidationErrors,
  randomMaintenanceBegin,
  maintenanceWindowWithBeginAndTimezone,
} from '@/utils'
import { isTimezone } from '@/utils/validators'
import TimeWithOffset from '@/utils/TimeWithOffset'
import moment from '@/utils/moment'
import { useAppStore } from '@/store'

const validationErrors = {
  maintenanceBegin: {
    required: 'Maintenance start time is required',
  },
  maintenanceTimezone: {
    required: 'Timezone is required',
    isTimezone: 'TimeZone must have format [+|-]HH:mm',
  },
}

export default {
  props: {
    timeWindowBegin: {
      type: String,
    },
    timeWindowEnd: {
      type: String,
    },
  },
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  validations () {
    return this.validators
  },
  data () {
    return {
      maintenanceTimezone: this.timezone,
      validationErrors,
      maintenanceBegin: undefined,
      windowDuration: 60,
    }
  },
  computed: {
    ...mapState(useAppStore, [
      'timezone',
    ]),
    validators () {
      return {
        maintenanceBegin: {
          required,
        },
        maintenanceTimezone: {
          required,
          isTimezone,
        },
      }
    },
  },
  watch: {
    timeWindowBegin (windowBegin) {
      this.setBeginTimeTimezoneString(windowBegin)
    },
    timeWindowEnd (windowEnd) {
      this.setEndTimeTimezoneString(windowEnd)
    },
  },
  mounted () {
    this.reset()
  },
  methods: {
    getMaintenanceWindow () {
      return maintenanceWindowWithBeginAndTimezone(this.maintenanceBegin, this.maintenanceTimezone, this.windowDuration)
    },
    reset () {
      if (!this.timeWindowBegin) {
        this.setDefaultMaintenanceTimeWindow()
      } else {
        this.setBeginTimeTimezoneString(this.timeWindowBegin)
      }
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    setBeginTimeTimezoneString (windowBegin) {
      const beginTime = new TimeWithOffset(windowBegin)
      if (!beginTime.isValid()) {
        return undefined
      }
      this.maintenanceBegin = beginTime.getTimeString()
      this.maintenanceTimezone = beginTime.getTimezoneString()
    },
    setEndTimeTimezoneString (windowEnd) {
      const endTime = new TimeWithOffset(windowEnd)
      if (!endTime.isValid()) {
        return undefined
      }
      const windowDuration = moment(windowEnd, 'HH:mm').diff(moment(this.maintenanceBegin, 'HH:mm'), 'minutes')
      if (windowDuration > 0) {
        this.windowDuration = windowDuration
      }
    },
    setDefaultMaintenanceTimeWindow () {
      this.maintenanceBegin = randomMaintenanceBegin()
      this.maintenanceTimezone = this.timezone
    },
    onInputmaintenanceBegin () {
      this.v$.maintenanceBegin.$touch()
    },
    onInputmaintenanceTimezone () {
      this.v$.maintenanceTimezone.$touch()
    },
  },
}
</script>

<style lang="scss" scoped>
  .regularInput {
    max-width: 300px;
  }
  .timezoneInput {
    max-width: 100px;
  }
</style>
