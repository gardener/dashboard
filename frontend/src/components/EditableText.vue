<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

<template>
  <v-menu
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
          v-on="on"
          class="grow content"
          :class="{ 'content--bounce': contentBounce }"
        >
          {{value}}
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
    <v-card flat @keydown.esc="onCancel" @keydown.enter="onSave">
      <slot name="info"></slot>
      <v-text-field
        :items="items"
        ref="textField"
        autocomplete="off"
        v-model="internalValue"
        @update:error="value => error = value"
        solo
        flat
        single-line
        hide-details="auto"
        :loading="loading"
        :messages="messages"
        :rules="rules"
        :color="color"
      >
        <template v-slot:append>
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" :disabled="error" icon color="success" @click="onSave">
                <v-icon>done</v-icon>
              </v-btn>
            </template>
            <span>Save</span>
          </v-tooltip>
        </template>
        <template v-slot:message="{ key, message }">
          <div v-if="!msgType(message)">
            {{msgText(message)}}
          </div>
          <v-alert
            v-else
            v-model="hasMessages"
            text dense
            dismissible
            close-label="Dismiss error"
            border="left"
            color="error"
            class="pl-2 mb-1"
          >
            <v-row
              no-gutters
              align="center"
              class="alert-expansion-panel"
              :class="{ 'alert-expansion-panel--active': errorDetails }"
            >
              <v-col class="shrink">
                <v-btn icon small color="error" @click="toogleErrorDetails">
                  <v-icon size="18">expand_more</v-icon>
                </v-btn>
              </v-col>
              <v-col class="grow alert-title" @click="toogleErrorDetails">
                {{msgText(message)}}
              </v-col>
            </v-row>
            <v-row v-if="errorDetails" no-gutters align="center">
              <v-col class="alert-subtitle">
                {{msgDescription(message)}}
              </v-col>
            </v-row>
          </v-alert>
        </template>
      </v-text-field>
    </v-card>
  </v-menu>
</template>

<script>

function normalizeMessage (msg) {
  try {
    const [message, detailedMessage] = JSON.parse(msg)
    return [1, message, detailedMessage]
  } catch (err) { /* ignore error */ }
  return [0, msg]
}

export default {
  name: 'editable-text',
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
    }
  },
  data () {
    return {
      contentWidth: 500,
      timeoutId: undefined,
      closeable: false,
      contentBounce: false,
      active: false,
      loading: false,
      messages: [],
      errorDetails: false,
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
    hasMessages: {
      get () {
        return !!this.messages.length
      },
      set (value) {
        if (!value) {
          this.messages = []
        }
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
      if (this.closeable) {
        return 'error'
      }
      return this.color
    },
    activatorIcon () {
      if (this.contentBounce) {
        return 'done'
      }
      if (this.closeable) {
        return 'close'
      }
      return 'edit'
    }
  },
  methods: {
    msgType (msg) {
      return normalizeMessage(msg)[0]
    },
    msgText (msg) {
      return normalizeMessage(msg)[1]
    },
    msgDescription (msg) {
      return normalizeMessage(msg)[2]
    },
    toogleErrorDetails () {
      this.errorDetails = !this.errorDetails
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
        clearTimeout(this.timeoutId)
        this.timeoutId = setTimeout(() => {
          this.contentBounce = false
        }, 1000)
      } catch (err) {
        this.messages.push(JSON.stringify([err.message, err.detailedMessage]))
      } finally {
        this.loading = false
      }
    },
    focus () {
      const textField = this.$refs.textField
      if (textField) {
        textField.focus()
      }
    },
    reset () {
      this.messages = []
      this.closeable = false
      this.errorDetails = false
      const textField = this.$refs.textField
      if (textField) {
        textField.resetValidation()
      }
    }
  },
  watch: {
    active (value) {
      if (value) {
        clearTimeout(this.timeoutId)
        this.timeoutId = setTimeout(() => {
          this.closeable = true
        }, 250)
        this.internalValue = this.value
        this.$emit('open')
        setTimeout(() => {
          this.focus()
        }, 50)
      } else {
        this.reset()
        this.$emit('close')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  @import '~vuetify/src/styles/styles.sass';

  $green-base: map-get($green, 'base');

  .alert-expansion-panel {
    &--active .v-icon {
      transform: rotate(-180deg)
    }
  }
  .alert-title {
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  .alert-subtitle {
    padding-top: 2px;
    font-size: 14px;
    font-family: monospace;
    margin-left: 28px;
  }
  .content {
    cursor: pointer;
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
