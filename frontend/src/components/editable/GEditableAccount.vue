<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
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
        origin="top left"
        location="top left"
        transition="slide-x-reverse-transition"
        :max-width="contentWidth"
        :close-on-content-click="false"
      >
        <template v-slot:activator="{ props }">
          <div class="d-flex align-center justify-space-between">
            <div
              class="content full-width mr-auto"
              :class="{ 'content--bounce': contentBounce }"
            >
              <g-account-avatar
                :account-name="modelValue"
                mail-to
                :color="color"
              />
            </div>
            <div class="">
              <v-btn
                v-bind="props"
                :icon="activatorIcon"
                variant="text"
                size="small"
                :color="activatorColor"
              />
            </div>
          </div>
        </template>
        <v-card rounded="0">
          <slot name="info"></slot>
          <v-autocomplete
            ref="editable"
            v-model="internalValue"
            :items="items"
            autocomplete="off"
            :no-data-text="noDataText"
            :placeholder="placeholder"
            hide-selected
            variant="plain"
            single-line
            chips
            hide-details="auto"
            :loading="loading"
            :messages="messages"
            :rules="rules"
            :color="color"
          >
            <template #append>
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    :disabled="error"
                    icon="mdi-check"
                    variant="text"
                    size="small"
                    color="success"
                    @click="onSave"
                  />
                </template>
                Save
              </v-tooltip>
            </template>
            <template v-slot:message="{ message }">
              <g-error-message
                :message="message"
                @close="clearMessages"
              />
            </template>
          </v-autocomplete>
        </v-card>
      </v-menu>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GErrorMessage from './GErrorMessage.vue'
import { setDelayedInputFocus } from '@/utils'

export default defineComponent({
  components: {
    GErrorMessage,
    GAccountAvatar,
  },
  props: {
    items: {
      type: Array,
    },
    modelValue: {
      required: true,
    },
    save: {
      type: Function,
      default: () => {},
    },
    rules: {
      type: Array,
      default: () => [],
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
  data () {
    return {
      contentWidth: 500,
      timeoutId: undefined,
      contentBounce: false,
      active: false,
      loading: false,
      messages: [],
      error: undefined,
      lazyValue: undefined,
    }
  },
  computed: {
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
  emits: [
    'update:modelValue',
    'open',
    'close',
  ],
  methods: {
    clearMessages () {
      this.messages = []
    },
    onCancel () {
      this.internalValue = this.modelValue
      this.isActive = false
    },
    async onSave (value) {
      this.loading = this.color
      try {
        await this.save(this.internalValue)
        this.$emit('update:modelValue', this.internalValue)
        setImmediate(() => {
          this.isActive = false
        })
        this.contentBounce = true
        this.timeoutId = setTimeout(() => {
          this.contentBounce = false
        }, 1000)
      } catch (err) {
        this.messages.push(JSON.stringify([err.message, err.detailedMessage]))
      } finally {
        this.loading = false
      }
    },
    reset () {
      this.messages = []
      const editable = this.$refs.editable
      if (editable) {
        editable.resetValidation()
      }
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
})
</script>

<style lang="scss" scoped>
  :deep(.v-text-field .v-input__append-outer) {
    margin: 6px 8px 6px 0;
    align-self: baseline;
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
