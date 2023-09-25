<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row class="my-0">
    <v-col class="regularInput">
      <g-time-text-field
        v-model="maintenanceBegin"
        color="primary"
        label="Maintenance Start Time"
        :error-messages="getErrorMessages('maintenanceBegin')"
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

import { useAppStore } from '@/store/app'

import GTimeTextField from '@/components/GTimeTextField.vue'

import {
  getValidationErrors,
  randomMaintenanceBegin,
  maintenanceWindowWithBeginAndTimezone,
  maintenanceWindowDuration,
} from '@/utils'
import { isTimezone } from '@/utils/validators'
import TimeWithOffset from '@/utils/TimeWithOffset'

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
  components: {
    GTimeTextField,
  },
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
      windowDuration: 0,
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
  mounted () {
    this.reset()
  },
  methods: {
    getMaintenanceWindow () {
      return maintenanceWindowWithBeginAndTimezone(this.maintenanceBegin, this.maintenanceTimezone, this.windowDuration)
    },
    reset () {
      if (!this.timeWindowBegin || !this.timeWindowEnd) {
        this.setDefaultBeginTimeAndTimezone()
        this.setDefaultWindowDuration()
      } else {
        this.setBeginTimeAndTimezone(this.timeWindowBegin)
        this.setWindowDuration(this.timeWindowEnd)
      }
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    setBeginTimeAndTimezone (windowBegin) {
      const beginTime = new TimeWithOffset(windowBegin)
      if (!beginTime.isValid()) {
        return undefined
      }
      this.maintenanceBegin = beginTime.getTimeString()
      this.maintenanceTimezone = beginTime.getTimezoneString()
    },
    setWindowDuration (windowEnd) {
      const endTime = new TimeWithOffset(windowEnd)
      if (!endTime.isValid()) {
        return undefined
      }
      const maintenanceEnd = endTime.getTimeString()
      const windowDuration = maintenanceWindowDuration(this.maintenanceBegin, maintenanceEnd)
      if (windowDuration > 0) {
        this.windowDuration = windowDuration
      } else {
        this.setDefaultWindowDuration()
      }
    },
    setDefaultBeginTimeAndTimezone () {
      this.maintenanceBegin = randomMaintenanceBegin()
      this.maintenanceTimezone = this.timezone
    },
    setDefaultWindowDuration () {
      this.windowDuration = 60
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
