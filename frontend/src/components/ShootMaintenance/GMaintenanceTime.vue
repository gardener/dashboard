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
        :error-messages="getErrorMessages(v$.maintenanceBegin)"
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
        :error-messages="getErrorMessages(v$.maintenanceTimezone)"
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
        :error-messages="getErrorMessages(v$.windowDuration)"
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

import {
  withFieldName,
  isTimezone,
} from '@/utils/validators'
import moment from '@/utils/moment'
import {
  getErrorMessages,
  randomMaintenanceBegin,
  maintenanceWindowWithBeginAndTimezone,
  getDurationInMinutes,
} from '@/utils'
import TimeWithOffset from '@/utils/TimeWithOffset'

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
    return {
      maintenanceBegin: withFieldName('Maintenance Begin', {
        required,
      }),
      maintenanceTimezone: withFieldName('Maintenance Timezone', {
        required,
        isTimezone,
      }),
      windowDuration: withFieldName('Maintenance Window Duration', {
        required,
        minValue: minValue(30),
        maxValue: maxValue(360),
      }),
    }
  },
  data () {
    return {
      maintenanceTimezone: this.timezone,
      maintenanceBegin: undefined,
      windowDuration: 0,
    }
  },
  computed: {
    ...mapState(useAppStore, [
      'timezone',
    ]),
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
    getErrorMessages,
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
