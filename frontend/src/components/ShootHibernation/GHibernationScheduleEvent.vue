<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="d-flex flex-nowrap align-center"
  >
    <div class="d-flex flex-wrap">
      <div class="large-input">
        <v-select
          ref="selectedDays"
          v-model="v$.selectedDays.$model"
          color="primary"
          item-color="primary"
          :items="weekdays"
          return-object
          :error-messages="getErrorMessages(v$.selectedDays)"
          chips
          label="Days of the week on which this rule shall be active"
          multiple
          closable-chips
          variant="underlined"
          @blur="touchIfNothingFocused"
        />
      </div>
      <div class="regular-input">
        <g-time-text-field
          ref="wakeUpTime"
          v-model="v$.wakeUpTime.$model"
          color="primary"
          label="Wake up at"
          :error-messages="getErrorMessages(v$.wakeUpTime)"
          clearable
          variant="underlined"
          @blur="touchIfNothingFocused"
        />
      </div>
      <div class="regular-input">
        <g-time-text-field
          ref="hibernateTime"
          v-model="v$.hibernateTime.$model"
          color="primary"
          label="Hibernate at"
          :error-messages="getErrorMessages(v$.hibernateTime)"
          clearable
          variant="underlined"
          @blur="touchIfNothingFocused"
        />
      </div>
      <div class="regular-input">
        <v-autocomplete
          v-model="v$.selectedLocation.$model"
          color="primary"
          label="Location"
          :items="locations"
          append-icon="mdi-map-marker-outline"
          variant="underlined"
        />
      </div>
    </div>
    <div class="ml-4 mr-2">
      <v-btn
        size="x-small"
        variant="tonal"
        icon="mdi-close"
        color="grey"
        @click.stop="removeHibernationScheduleEvent(id)"
      />
    </div>
  </div>
</template>

<script>
import {
  required,
  requiredIf,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import GTimeTextField from '@/components/GTimeTextField.vue'

import { useShootContext } from '@/composables/useShootContext'

import {
  withMessage,
  withFieldName,
} from '@/utils/validators'
import { getErrorMessages } from '@/utils'
import {
  parseTimeString,
  formatTimeString,
} from '@/utils/hibernationSchedule'
import moment from '@/utils/moment'

import {
  join,
  split,
  compact,
  get,
  set,
  map,
  filter,
  isEmpty,
  includes,
} from '@/lodash'

export default {
  components: {
    GTimeTextField,
  },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  setup () {
    const {
      getHibernationScheduleEvent,
      removeHibernationScheduleEvent,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      getHibernationScheduleEvent,
      removeHibernationScheduleEvent,
    }
  },
  validations () {
    const rules = {
      selectedDays: withFieldName('Hibernation Selected Days', {
        required,
      }),
      selectedLocation: withFieldName('Hibernation Location', {
        required,
      }),
    }

    const hibernateTimeRules = {
      required: withMessage('You need to specify at least hibernation or wake up time',
        requiredIf(() => !this.wakeUpTime),
      ),
    }
    rules.hibernateTime = withFieldName('Hibernation Time', hibernateTimeRules)

    const wakeUpTimeRules = {
      required: withMessage('You need to specify at least hibernation or wake up time',
        requiredIf(() => !this.hibernateTime),
      ),
    }
    rules.wakeUpTime = withFieldName('Hibernation Wake Up Time', wakeUpTimeRules)

    return rules
  },
  data () {
    return {
      locations: moment.tz.names(),
      weekdays: [
        {
          title: 'Mon',
          value: 1,
          sortValue: 1,
        },
        {
          title: 'Tue',
          value: 2,
          sortValue: 2,
        },
        {
          title: 'Wed',
          value: 3,
          sortValue: 3,
        },
        {
          title: 'Thu',
          value: 4,
          sortValue: 4,
        },
        {
          title: 'Fri',
          value: 5,
          sortValue: 5,
        },
        {
          title: 'Sat',
          value: 6,
          sortValue: 6,
        },
        {
          title: 'Sun',
          value: 0,
          sortValue: 7,
        },
      ],
    }
  },
  computed: {
    scheduleEvent () {
      return this.getHibernationScheduleEvent(this.id)
    },
    selectedLocation: {
      get () {
        return get(this.scheduleEvent, 'location')
      },
      set (value) {
        set(this.scheduleEvent, 'location', value)
      },
    },
    wakeUpTime: {
      get () {
        return formatTimeString(get(this.scheduleEvent, 'end'))
      },
      set (value) {
        const time = parseTimeString(value)
        if (time) {
          set(this.scheduleEvent, 'end.minute', time.minute)
          set(this.scheduleEvent, 'end.hour', time.hour)
        }
      },
    },
    hibernateTime: {
      get () {
        return formatTimeString(get(this.scheduleEvent, 'start'))
      },
      set (value) {
        const time = parseTimeString(value)
        if (time) {
          set(this.scheduleEvent, 'start.minute', time.minute)
          set(this.scheduleEvent, 'start.hour', time.hour)
        }
      },
    },
    selectedDays: {
      get () {
        const startDays = get(this.scheduleEvent, 'start.weekdays')
        const endDays = get(this.scheduleEvent, 'end.weekdays')
        const days = compact(split(startDays ?? endDays, ','))
        if (isEmpty(days)) {
          return null
        }
        const dayValues = map(days, value => parseInt(value, 10))
        return filter(this.weekdays, ({ value }) => includes(dayValues, value))
      },
      set (value) {
        const weekdays = join(map(value, 'value'), ',')
        set(this.scheduleEvent, 'start.weekdays', weekdays)
        set(this.scheduleEvent, 'end.weekdays', weekdays)
      },
    },
  },
  methods: {
    touchIfNothingFocused () {
      if (!get(this, '$refs.selectedDays.isFocused') &&
          !get(this, '$refs.wakeUpTime.isFocused') &&
          !get(this, '$refs.hibernateTime.isFocused')) {
        this.v$.selectedDays.$touch()
        this.v$.wakeUpTime.$touch()
        this.v$.hibernateTime.$touch()
      }
    },
    getErrorMessages,
  },
}
</script>

<style lang="scss" scoped>
:deep(.v-chip--disabled) {
  opacity: 1;
}
</style>
