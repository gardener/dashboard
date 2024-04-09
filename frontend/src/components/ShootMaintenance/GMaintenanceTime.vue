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

<script setup>
import {
  ref,
  computed,
  toRef,
  watchEffect,
} from 'vue'
import {
  required,
  minValue,
  maxValue,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useAppStore } from '@/store/app'
import { useShootContextStore } from '@/store/shootContext'

import GTimeTextField from '@/components/GTimeTextField.vue'

import {
  getErrorMessages,
  randomMaintenanceBegin,
  maintenanceWindowWithBeginAndTimezone,
  getDurationInMinutes,
} from '@/utils'
import moment from '@/utils/moment'
import {
  withFieldName,
  isTimezone,
} from '@/utils/validators'
import TimeWithOffset from '@/utils/TimeWithOffset'

const appStore = useAppStore()
const shootContextStore = useShootContextStore()

const timezone = toRef(appStore, 'timezone')
const maintenanceTimeWindowBegin = toRef(shootContextStore, 'maintenanceTimeWindowBegin')
const maintenanceTimeWindowEnd = toRef(shootContextStore, 'maintenanceTimeWindowEnd')

const maintenanceBegin = ref(randomMaintenanceBegin())
const maintenanceTimezone = ref(timezone.value)
const defaultDuration = 60
const windowDuration = ref(defaultDuration)

const rules = {
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
const state = {
  maintenanceBegin,
  maintenanceTimezone,
  windowDuration,
}
const v$ = useVuelidate(rules, state)

const initialize = () => {
  const beginTime = new TimeWithOffset(maintenanceTimeWindowBegin.value)
  if (beginTime.isValid()) {
    maintenanceBegin.value = beginTime.getTimeString()
    maintenanceTimezone.value = beginTime.getTimezoneString()
  }
  const endTime = new TimeWithOffset(maintenanceTimeWindowEnd.value)
  if (endTime.isValid()) {
    let duration = getDurationInMinutes(maintenanceBegin.value, endTime.getTimeString())
    if (duration <= 0) {
      duration = defaultDuration
    }
    windowDuration.value = duration
  }
}
initialize()

const maintenanceBeginMoment = computed(() => {
  return moment.utc(`${maintenanceBegin.value}${maintenanceTimezone.value}`, 'HH:mmZ')
})

const maintenanceBeginHint = computed(() => {
  if (!maintenanceBeginMoment.value.isValid()) {
    return undefined
  }
  return `Maintenance time window begins at ${maintenanceBeginMoment.value.format('HH:mm')} UTC`
})

const maintenanceEndHint = computed(() => {
  if (!maintenanceBeginMoment.value.isValid()) {
    return undefined
  }
  const maintenanceEndMoment = maintenanceBeginMoment.value.add(windowDuration.value, 'minutes')
  return `Maintenance time window ends at ${maintenanceEndMoment.format('HH:mm')} UTC`
})

watchEffect(() => {
  const timeWindow = maintenanceWindowWithBeginAndTimezone(maintenanceBegin.value, maintenanceTimezone.value, windowDuration.value)
  if (timeWindow) {
    maintenanceTimeWindowBegin.value = timeWindow.begin
    maintenanceTimeWindowEnd.value = timeWindow.end
  }
})
</script>

<style lang="scss" scoped>
.smallInput {
  max-width: 180px;
}
.timezoneInput {
  max-width: 100px;
}
</style>
