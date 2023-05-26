
import { defineComponent } from 'vue'
<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row class="my-0">
    <v-col class="regularInput">
      <v-text-field
        color="primary"
        label="Maintenance Start Time"
        v-model="maintenanceBegin"
        :error-messages="getErrorMessages('maintenanceBegin')"
        @input="onInputmaintenanceBegin"
        @blur="v$.maintenanceBegin.$touch()"
        type="time"
        persistent-hint
        hint="Provide start of maintenance time window in which Gardener may schedule automated cluster updates."
      ></v-text-field>
    </v-col>
    <v-col class="timezoneInput">
      <v-text-field
        color="primary"
        label="Timezone"
        v-model="maintenanceTimezone"
        :error-messages="getErrorMessages('maintenanceTimezone')"
        @input="onInputmaintenanceTimezone"
        @blur="v$.maintenanceTimezone.$touch()"
      ></v-text-field>
    </v-col>
  </v-row>
</template>

<script>
import { defineComponent } from 'vue'

import { mapState } from 'pinia'
import { required } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { getValidationErrors, randomMaintenanceBegin, maintenanceWindowWithBeginAndTimezone } from '@/utils'
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

export default defineComponent({
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  props: {
    timeWindowBegin: {
      type: String,
    },
    timeWindowEnd: {
      type: String,
    },
  },
  computed: {
    ...mapState(useAppStore, [
      'timezone',
    ]),
  },
  validations: {
    maintenanceBegin: {
      required,
    },
    maintenanceTimezone: {
      required,
      isTimezone,
    },
  },
  data () {
    return {
      maintenanceTimezone: this.timezone,
      validationErrors,
      maintenanceBegin: undefined,
      windowDuration: 60,
      valid: undefined,
    }
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
      this.validateInput()
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    validateInput () {
      if (this.valid !== !this.v$.$invalid) {
        this.valid = !this.v$.$invalid
        this.$emit('valid', this.valid)
      }
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
      this.validateInput()
    },
    onInputmaintenanceTimezone () {
      this.v$.maintenanceTimezone.$touch()
      this.validateInput()
    },
  },
  watch: {
    timeWindowBegin (windowBegin) {
      this.setBeginTimeTimezoneString(windowBegin)
      this.validateInput()
    },
    timeWindowEnd (windowEnd) {
      this.setEndTimeTimezoneString(windowEnd)
    },
  },
  mounted () {
    this.reset()
  },
})
</script>

<style lang="scss" scoped>
  .regularInput {
    max-width: 300px;
  }
  .timezoneInput {
    max-width: 100px;
  }
</style>
