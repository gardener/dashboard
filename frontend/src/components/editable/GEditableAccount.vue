<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-account-avatar
    v-if="readOnly"
    :account-name="modelValue"
    :color="color"
    mail-to
  />
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
          <g-account-avatar
            :account-name="modelValue"
            :color="color"
            mail-to
          />
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
      <v-autocomplete
        ref="editable"
        v-model="internalValue"
        :items="items"
        variant="solo"
        flat
        density="comfortable"
        single-line
        hide-details="auto"
        autocomplete="off"
        hide-selected
        :no-data-text="noDataText"
        :placeholder="placeholder"
        :color="color"
        :loading="loading"
        :messages="messages"
        :menu-props="{ offset: [1, 0] }"
        :error-messages="getErrorMessages(v$.internalValue)"
        class="g-field"
        @update:model-value="v$.internalValue.$touch"
        @blur="v$.internalValue.$touch"
      >
        <template #item="{ item, props: itemProps }">
          <v-list-item
            v-bind="{ ...itemProps, title: undefined }"
          >
            <g-account-avatar
              :account-name="item.value"
              :size="24"
            />
          </v-list-item>
        </template>
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
      </v-autocomplete>
    </v-card>
  </v-menu>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'

import GAccountAvatar from '@/components/GAccountAvatar.vue'

import {
  setDelayedInputFocus,
  getErrorMessages,
} from '@/utils'

import GErrorMessage from './GErrorMessage.vue'

export default {
  components: {
    GErrorMessage,
    GAccountAvatar,
  },
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    items: {
      type: Array,
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
    placeholder: {
      type: String,
    },
    noDataText: {
      type: String,
    },
    readOnly: {
      type: Boolean,
      default: false,
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
        setDelayedInputFocus(this, 'editable', {
          delay: 50,
          noSelect: true,
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
      const editable = this.$refs.editable
      if (editable) {
        editable.resetValidation()
      }
    },
    getErrorMessages,
  },
}
</script>

<style lang="scss" scoped>
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

  .content {
    padding: 3px 0;
    animation-duration: 900ms;
    animation-iteration-count: 1;
    transform-origin: bottom;
    &--bounce {
      animation-name: bounce;
      animation-timing-function: ease;
    }
  }

  @keyframes bounce {
    0%   { transform: scale(1,1)    translateY(0); }
    10%  { transform: scale(1.1,.9) translateY(0); }
    30%  { transform: scale(.9,1.1) translateY(-4px); }
    50%  { transform: scale(1,1)    translateY(0); }
    100% { transform: scale(1,1)    translateY(0); }
  }
</style>
