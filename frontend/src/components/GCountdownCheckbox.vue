<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="d-flex"
  >
    <div class="mr-3 d-flex align-center checkbox-div">
      <v-checkbox
        v-if="!isCountdownActive"
        v-model="internalValue"
        hide-details
        color="primary"
      />
      <v-progress-circular
        v-else
        :model-value="countdownProgress"
      >
        {{ countdown }}
      </v-progress-circular>
    </div>
    <div
      class="d-flex align-center text-body-2"
      :class="isCountdownActive ? 'checkbox-text-disabled': 'checkbox-text-enabled'"
      @click="onClick"
    >
      <slot />
    </div>
  </div>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'

import {
  withFieldName,
  withMessage,
} from '@/utils/validators'

export default {
  props: {
    modelValue: {
      type: Boolean,
    },
    seconds: {
      type: Number,
      default: 5,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      isCountdownActive: false,
      countdown: 0,
      countdownProgress: 0,
      countdownInterval: undefined,
    }
  },
  validations () {
    return {
      internalValue: withFieldName('Confirmation', {
        required: withMessage('Confirmation is required', () => {
          return !!this.internalValue
        }),
      }),
    }
  },
  computed: {
    internalValue: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      },
    },
  },
  mounted () {
    this.resetCountdown()
  },
  methods: {
    resetCountdown () {
      clearInterval(this.countdownInterval)
      this.isCountdownActive = true
      this.countdown = this.seconds
      this.countdownProgress = 100

      this.countdownInterval = setInterval(() => {
        this.countdownProgress--
        this.countdown = Math.round(this.countdownProgress / 100 * this.seconds)
        if (this.countdown === 0) {
          this.isCountdownActive = false
          clearInterval(this.countdownInterval)
        }
      }, 10 * this.seconds)
    },
    onClick () {
      if (!this.isCountdownActive) {
        this.internalValue = !this.internalValue
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.checkbox-text-disabled {
  opacity: 0.5;
}

.checkbox-text-enabled {
  opacity: 1;
  transition: opacity 1s ease-in-out;
  cursor: pointer
}
.checkbox-div {
  width: 40px;
  height: 80px;
}
</style>
