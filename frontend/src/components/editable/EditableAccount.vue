<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <account-avatar
      v-if="readOnly"
      :account-name="value"
      mail-to
      :color="color"
    ></account-avatar>
    <v-menu
        v-else
        ref="menu"
        :close-on-click="true"
        :close-on-content-click="false"
        origin="top left"
        left
        transition="slide-x-reverse-transition"
        :max-width="contentWidth"
        v-model="isActive"
      >
        <template v-slot:activator="{ on }">
          <v-row  no-gutters align="center" justify="space-between">
            <v-col
              ref="content"
              class="grow content"
              :class="{ 'content--bounce': contentBounce }"
            >
              <account-avatar :account-name="value" mail-to :color="color"></account-avatar>
            </v-col>
            <v-col class="shrink">
              <v-btn
                v-on="on"
                icon
                :color="activatorColor"
              >
                <v-icon size="18">{{activatorIcon}}</v-icon>
              </v-btn>
            </v-col>
          </v-row>
        </template>
        <v-card tile>
          <slot name="info"></slot>
          <v-autocomplete
            :items="items"
            ref="editable"
            autocomplete="off"
            :no-data-text="noDataText"
            :placeholder="placeholder"
            hide-selected
            v-model="internalValue"
            @update:error="value => error = value"
            solo
            chips
            flat
            single-line
            hide-details="auto"
            :loading="loading"
            :messages="messages"
            :rules="rules"
            :color="color"
          >
            <template v-slot:selection="{ item: value }">
              <account-avatar :account-name="value" :color="color"></account-avatar>
            </template>
            <template v-slot:item="{ item: value }">
              <v-list-item-content>
                <account-avatar :account-name="value" :color="color"></account-avatar>
              </v-list-item-content>
            </template>
            <template v-slot:append-outer>
              <v-tooltip top>
                <template v-slot:activator="{ on }">
                  <v-btn
                    v-on="on"
                    :disabled="error"
                    icon
                    color="success"
                    @click="onSave">
                    <v-icon>mdi-check</v-icon>
                  </v-btn>
                </template>
                <div>Save</div>
              </v-tooltip>
            </template>
            <template v-slot:message="{ key, message }">
              <error-message :message="message" @close="clearMessages"/>
            </template>
          </v-autocomplete>
        </v-card>
      </v-menu>
  </div>
</template>

<script>
import AccountAvatar from '@/components/AccountAvatar'
import ErrorMessage from './ErrorMessage'
import { setDelayedInputFocus } from '@/utils'

export default {
  name: 'editable-account',
  components: {
    ErrorMessage,
    AccountAvatar
  },
  props: {
    items: {
      type: Array
    },
    value: {
      required: true
    },
    save: {
      type: Function,
      default: () => {}
    },
    rules: {
      type: Array,
      default: () => []
    },
    color: {
      type: String,
      default: 'blue-grey darken-2'
    },
    placeholder: {
      type: String
    },
    noDataText: {
      type: String
    },
    readOnly: {
      type: Boolean,
      default: false
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
      error: undefined,
      lazyValue: undefined
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
      }
    },
    internalValue: {
      get () {
        return this.lazyValue
      },
      set (value) {
        this.lazyValue = value
      }
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
    }
  },
  methods: {
    clearMessages () {
      this.messages = []
    },
    onCancel () {
      this.internalValue = this.value
      this.isActive = false
    },
    async onSave (value) {
      this.loading = this.color
      try {
        await this.save(this.internalValue)
        this.$emit('input', this.internalValue)
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
    }
  },
  watch: {
    active (value) {
      if (value) {
        clearTimeout(this.timeoutId)
        this.internalValue = this.value
        this.$emit('open')
        setDelayedInputFocus(this, 'editable', {
          delay: 50,
          noSelect: true
        })
      } else {
        this.reset()
        this.$emit('close')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  ::v-deep .v-text-field .v-input__append-outer {
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
