<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span class="text-subtitle-2">Provide start of maintenance time window in which Gardener may schedule automated cluster updates</span>
  <v-row class="my-0">
    <v-col class="smallInput">
      <g-time-text-field
        v-model="maintenanceBegin"
        color="primary"
        label="Maintenance Start Time"
        :error-messages="getErrorMessages('maintenanceBegin')"
        variant="underlined"
        persistent-hint
        :hint="maintenanceBeginHint"
        @input="v$.maintenanceBegin.$touch()"
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
        @input="v$.maintenanceTimezone.$touch()"
        @blur="v$.maintenanceTimezone.$touch()"
      />
    </v-col>
    <v-col class="smallInput">
      <v-text-field
        v-model="windowDuration"
        color="primary"
        type="number"
        label="Maintenance Window Size"
        :error-messages="getErrorMessages('windowDuration')"
        suffix="minutes"
        variant="underlined"
        persistent-hint
        :hint="maintenanceEndHint"
        @input="v$.windowDuration.$touch()"
        @blur="v$.windowDuration.$touch()"
      />
    </v-col>
  </v-row>
</template>

<script>
import { mapState } from 'pinia'
import {
  required,
  minValue,
  maxValue,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useAppStore } from '@/store/app'

import GTimeTextField from '@/components/GTimeTextField.vue'

import moment from '@/utils/moment'
import {
  getValidationErrors,
  randomMaintenanceBegin,
  maintenanceWindowWithBeginAndTimezone,
  getDurationInMinutes,
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
  windowDuration: {
    required: 'Maintenance window size is required',
    minValue: 'Minimum duration is 30 minutes',
    maxValue: 'Maximum duration is 360 minutes (6h)',
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
        windowDuration: {
          required,
          minValue: minValue(30),
          maxValue: maxValue(360),
        },
      }
    },
    maintenanceBeginMoment () {
      return moment.utc(`${this.maintenanceBegin}${this.maintenanceTimezone}`, 'HH:mmZ')
    },
    maintenanceBeginHint () {
      if (!this.maintenanceBeginMoment.isValid()) {
        return undefined
      }
      return `Maintenance time window begins at ${this.maintenanceBeginMoment.format('HH:mm')} UTC`
    },
    maintenanceEndHint () {
      if (!this.maintenanceBeginMoment.isValid()) {
        return undefined
      }
      const maintenanceEndMoment = this.maintenanceBeginMoment.add(this.windowDuration, 'minutes')
      return `Maintenance time window ends at ${maintenanceEndMoment.format('HH:mm')} UTC`
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
        this.setMaintenanceWindow(this.timeWindowBegin, this.timeWindowEnd)
      }
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    setMaintenanceWindow (begin, end) {
      const defaultDuration = 60
      if (begin && end) {
        const beginTime = new TimeWithOffset(begin)
        if (beginTime.isValid()) {
          this.maintenanceBegin = beginTime.getTimeString()
          this.maintenanceTimezone = beginTime.getTimezoneString()
        }
        const endTime = new TimeWithOffset(end)
        if (endTime.isValid()) {
          const duration = getDurationInMinutes(this.maintenanceBegin, endTime.getTimeString())
          this.windowDuration = duration > 0 ? duration : defaultDuration
        }
      } else {
        this.maintenanceBegin = randomMaintenanceBegin()
        this.maintenanceTimezone = this.timezone
        this.windowDuration = defaultDuration
      }
    },
    setDefaultBeginTimeAndTimezone () {
      this.maintenanceBegin = randomMaintenanceBegin()
      this.maintenanceTimezone = this.timezone
    },
    setDefaultWindowDuration () {
      this.windowDuration = 60
    },
  },
}
</script>

<style lang="scss" scoped>
  .smallInput {
    max-width: 180px;
  }
  .timezoneInput {
    max-width: 100px;
  }
</style>
