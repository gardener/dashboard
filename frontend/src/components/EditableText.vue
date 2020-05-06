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
    :max-width="boxWidth"
    v-model="isActive"
  >
    <template v-slot:activator="{ on }">
      <v-row no-gutters align="center" justify="space-between">
        <v-col
          ref="box"
          v-on="on"
          v-ripple="{ class: `grey--text text--lighten-4` }"
          class="box"
          :class="{ 'box--bounce': boxBounce }"
        >
          {{value}}
        </v-col>
        <v-col class="action">
          <v-btn
            v-on="on"
            icon
            :color="isActive ? 'error' : color"
          >
            <v-icon size="16">{{ isActive ?  'close' : 'edit' }}</v-icon>
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
          <!--v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon color="secondary" @click="onCancel">
                <v-icon>close</v-icon>
              </v-btn>
            </template>
            <span>Cancel</span>
          </v-tooltip-->
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
      boxWidth: 500,
      timeoutId: undefined,
      boxBounce: false,
      active: false,
      loading: false,
      messages: [],
      errorDetails: false,
      error: undefined,
      lazyValue: undefined
    }
  },
  computed: {
    vInputComponent () {
      return Array.isArray(this.items) ? 'v-select' : 'v-text-field'
    },
    isActive: {
      get () {
        return this.active
      },
      set (value) {
        if (this.$refs.box) {
          const { width } = this.$refs.box.getBoundingClientRect()
          this.boxWidth = width - 8
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
        this.boxBounce = true
        this.timeoutId = setTimeout(() => {
          this.boxBounce = false
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
  .action {
    max-width: 36px;
  }
  .box {
    cursor: pointer;
    padding: 3px 0;
    border-color: transparent;
    border-style: solid;
    border-width: 0 0 thin 0;
    animation-duration: 900ms;
    animation-iteration-count: 1;
    transform-origin: bottom;
    &:hover {
      border-color: rgba(0,0,0,.42);
      border-image: repeating-linear-gradient(90deg,rgba(0,0,0,.38) 0,rgba(0,0,0,.38) 2px,transparent 0,transparent 4px) 1 repeat;
    }
    &--bounce {
      animation-name: bounce;
      animation-timing-function: ease;
    }
  }

  @mixin success-text {
    color: #388E3C;
  }

  @keyframes bounce {
    0%   { transform: scale(1,1)    translateY(0);    @include success-text; }
    10%  { transform: scale(1.1,.9) translateY(0);    @include success-text; }
    30%  { transform: scale(.9,1.1) translateY(-4px); @include success-text; }
    50%  { transform: scale(1,1)    translateY(0);    @include success-text; }
    100% { transform: scale(1,1)    translateY(0); }
  }
</style>
