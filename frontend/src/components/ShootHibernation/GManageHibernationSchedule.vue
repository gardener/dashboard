<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="alternate-row-background">
    <v-expand-transition group>
      <v-row
        v-for="{ id } in hibernationScheduleEvents"
        :key="id"
        class="list-item"
      >
        <g-hibernation-schedule-event :id="id" />
      </v-row>
    </v-expand-transition>
    <v-row
      v-if="!hibernationSchedulesError"
      class="list-item my-1"
    >
      <v-col>
        <v-btn
          variant="text"
          color="primary"
          @click="addHibernationScheduleEvent"
        >
          <v-icon class="text-primary">
            mdi-plus
          </v-icon>
          Add Hibernation Schedule
        </v-btn>
      </v-col>
    </v-row>
    <v-row
      v-show="showNoScheduleCheckbox"
      align="center"
      class="list-item"
    >
      <v-col>
        <v-checkbox
          v-model="noHibernationSchedules"
          color="primary"
          class="my-0"
          :label="noScheduleCheckboxLabel"
          hint="Check the box above to avoid getting prompted for setting a hibernation schedule"
          persistent-hint
        />
      </v-col>
    </v-row>
    <v-row
      v-if="hibernationSchedulesError"
      class="pt-2"
    >
      <v-alert
        type="warning"
        variant="tonal"
      >
        One or more errors occured while parsing hibernation schedules. Your configuration may still be valid - the Dashboard UI currently only supports basic schedules.<br>
        You probably configured crontab lines for your hibernation schedule manually. Please edit your schedules directly in the cluster specification. You can also delete it there and come back to this screen to configure your schedule via the Dashboard UI.
      </v-alert>
    </v-row>
    <v-row
      v-if="!isHibernationPossible"
      class="pt-2"
    >
      <v-col>
        <v-alert
          type="warning"
          variant="tonal"
          :model-value="!isHibernationPossible && !isEmpty(hibernationScheduleEvents)"
        >
          <div class="font-weight-bold">
            Your hibernation schedule may not have any effect:
          </div>
          {{ hibernationPossibleMessage }}
        </v-alert>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { mapActions } from 'pinia'
import { useVuelidate } from '@vuelidate/core'

import { useConfigStore } from '@/store/config'

import GHibernationScheduleEvent from '@/components/ShootHibernation/GHibernationScheduleEvent'

import { useShootContext } from '@/composables/useShootContext'

import { isEmpty } from '@/lodash'

export default {
  components: {
    GHibernationScheduleEvent,
  },
  inject: ['logger'],
  props: {
    isHibernationPossible: {
      type: Boolean,
      default: true,
    },
    hibernationPossibleMessage: {
      type: String,
      default: '',
    },
  },
  setup () {
    const {
      purpose,
      hibernationSchedulesError,
      noHibernationSchedules,
      hibernationScheduleEvents,
      addHibernationScheduleEvent,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      purpose,
      hibernationSchedulesError,
      noHibernationSchedules,
      hibernationScheduleEvents,
      addHibernationScheduleEvent,
    }
  },
  computed: {
    showNoScheduleCheckbox () {
      return this.purposeRequiresHibernationSchedule(this.purpose) &&
        isEmpty(this.hibernationScheduleEvents) &&
        !this.hibernationSchedulesError
    },
    noScheduleCheckboxLabel () {
      const purpose = this.purpose ?? ''
      return `This ${purpose} cluster does not need a hibernation schedule`
    },
  },
  methods: {
    ...mapActions(useConfigStore, [
      'purposeRequiresHibernationSchedule',
    ]),
    isEmpty,
  },
}
</script>
