<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <span v-if="readOnly">
    {{ modelValue }}
  </span>
  <v-menu
    v-else
    ref="menu"
    v-model="isActive"
    location="top start"
    origin="overlap"
    transition="slide-x-reverse-transition"
    :max-width="contentWidth"
    :close-on-content-click="false"
  >
    <template #activator="{ props }">
      <div class="d-flex align-center justify-space-between">
        <div
          ref="content"
          v-bind="props"
          class="content cursor-pointer full-width mr-auto"
          :class="{ 'content--bounce': contentBounce }"
        >
          <template v-if="modelValue">
            {{ modelValue }}
          </template>
          <div
            v-else
            class="text-body-2 font-weight-light text-disabled"
          >
            {{ noValueText }}
          </div>
        </div>
        <div>
          <v-btn
            :icon="activatorIcon"
            variant="text"
            size="small"
            :color="activatorColor"
            @click.stop="isActive = !isActive"
          />
        </div>
      </div>
    </template>
    <v-card
      flat
      @keydown.esc.prevent="onCancel"
      @keydown.enter.prevent="onSave"
    >
      <slot name="info" />
      <v-text-field
        ref="textField"
        v-model="internalValue"
        variant="solo"
        flat
        density="comfortable"
        single-line
        hide-details="auto"
        autocomplete="off"
        :color="color"
        :loading="loading"
        :messages="messages"
        :error-messages="getErrorMessages(v$.internalValue)"
        class="g-field"
        :counter="counter"
        :maxlength="maxLength"
        @input="v$.internalValue.$touch"
        @blur="v$.internalValue.$touch"
      >
        <template #append>
          <v-btn
            v-tooltip:top="'Save'"
            :disabled="!valid"
            icon="mdi-check"
            variant="text"
            density="comfortable"
            color="success"
            @click="onSave"
          />
        </template>
        <template #message="{ message }">
          <g-error-message
            :message="message"
            @close="clearMessages"
          />
        </template>
      </v-text-field>
    </v-card>
  </v-menu>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'

import {
  setDelayedInputFocus,
  getErrorMessages,
} from '@/utils'

import GErrorMessage from './GErrorMessage.vue'

export default {
  components: {
    GErrorMessage,
  },
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    save: {
      type: Function,
      default: () => {},
    },
    rules: {
      type: Object,
      default: () => ({}),
    },
    color: {
      type: String,
      default: 'primary',
    },
    noValueText: {
      type: String,
      default: 'Not defined',
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
    counter: {
      type: Boolean,
      default: false,
    },
    maxLength: {
      type: Number,
    },
  },
  emits: [
    'update:modelValue',
    'open',
    'close',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      contentWidth: 500,
      timeoutId: undefined,
      contentBounce: false,
      active: false,
      loading: false,
      messages: [],
      lazyValue: undefined,
    }
  },
  validations () {
    return {
      internalValue: {
        ...this.rules,
      },
    }
  },
  computed: {
    valid () {
      return !this.v$.$invalid
    },
    isActive: {
      get () {
        return this.active
      },
      set (value) {
        if (this.$refs.content) {
          const { width } = this.$refs.content.getBoundingClientRect()
          this.contentWidth = width - 8
        }
        this.active = value
      },
    },
    internalValue: {
      get () {
        return this.lazyValue
      },
      set (value) {
        this.lazyValue = value
      },
    },
    activatorColor () {
      if (this.contentBounce) {
        return 'success'
      }
      return this.color
    },
    activatorIcon () {
      if (this.contentBounce) {
        return 'mdi-check'
      }
      if (this.isActive) {
        return 'mdi-close'
      }
      return 'mdi-pencil'
    },
  },
  watch: {
    active (value) {
      if (value) {
        clearTimeout(this.timeoutId)
        this.internalValue = this.modelValue
        this.$emit('open')
        setDelayedInputFocus(this, 'textField', {
          delay: 50,
        })
      } else {
        this.reset()
        this.$emit('close')
      }
    },
  },
  methods: {
    clearMessages () {
      this.messages = []
    },
    onCancel () {
      this.internalValue = this.modelValue
      this.isActive = false
    },
    async onSave () {
      if (!this.valid) {
        return
      }
      this.loading = this.color
      try {
        await this.save(this.internalValue)
        this.$emit('update:modelValue', this.internalValue)
        setTimeout(() => {
          this.isActive = false
        }, 0)
        this.contentBounce = true
        this.timeoutId = setTimeout(() => {
          this.contentBounce = false
        }, 1000)
      } catch (err) {
        this.messages.push(JSON.stringify([
          err.message,
          err.detailedMessage,
        ]))
      } finally {
        this.loading = false
      }
    },
    reset () {
      this.clearMessages()
      this.v$.$reset()
    },
    getErrorMessages,
  },
}
</script>

<style lang="scss" scoped>
  @use 'vuetify/settings' as vuetify;
  @use 'sass:map';

  .g-field {
    :deep(.v-input__details .v-messages) {
      opacity: 1 !important;
      padding-bottom: 6px;
    }
    :deep(.v-input__append),
    :deep(.v-field__append-inner) {
      display: flex;
      flex-wrap: nowrap;
      align-items: center !important;
      padding-top: 0;
      margin-inline-start: 4px;
    }
  }

  $green-base: map.get(vuetify.$green, 'base');

  .content {
    animation-duration: 900ms;
    animation-iteration-count: 1;
    transform-origin: bottom;
    &--bounce {
      animation-name: bounce;
      animation-timing-function: ease;
    }
  }

  @keyframes bounce {
    0%   { transform: scale(1,1)    translateY(0);    color: $green-base; }
    10%  { transform: scale(1.1,.9) translateY(0);    color: $green-base; }
    30%  { transform: scale(.9,1.1) translateY(-4px); color: $green-base; }
    50%  { transform: scale(1,1)    translateY(0);    color: $green-base; }
    100% { transform: scale(1,1)    translateY(0); }
  }
</style>
