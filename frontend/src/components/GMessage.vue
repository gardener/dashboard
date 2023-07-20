<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-theme-provider :theme="dark ? 'dark' : 'light'">
    <v-expand-transition appear>
      <v-alert
        v-model="alertVisible"
        :color="color"
        :rounded="!tile"
        closable
      >
        <div class="text-subtitle-1">
          {{ message }}
          <v-btn
            v-if="!!detailedMessage"
            variant="outlined"
            size="small"
            @click="detailedMessageVisible = !detailedMessageVisible"
          >
            Details
          </v-btn>
        </div>
        <transition name="fade">
          <div v-if="!!detailedMessageVisible">
            <code>{{ detailedMessage }}</code>
          </div>
        </transition>
      </v-alert>
    </v-expand-transition>
  </v-theme-provider>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    message: {
      type: String,
      default: '',
    },
    detailedMessage: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      required: true,
    },
    tile: {
      type: Boolean,
      default: false,
    },
    dark: {
      type: Boolean,
      default: true,
    },
  },
  emits: [
    'update:message',
    'update:detailedMessage',
  ],
  data () {
    return {
      detailedMessageVisible: false,
    }
  },
  computed: {
    alertVisible: {
      get () {
        return !!this.message
      },
      set (value) {
        if (!value) {
          this.$emit('update:message', undefined)
          this.$emit('update:detailedMessage', undefined)
        }
      },
    },
  },
})
</script>

<style lang="scss" scoped>
  .fade-enter-active, .fade-leave-active {
    transition: opacity .5s;
  }
  .fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }
</style>
