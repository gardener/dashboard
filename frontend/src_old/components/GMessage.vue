<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <!-- TODO: previously there were a "dark"-attributes on v-alert and v-btn.
      check if the theme-provider behaves identical -->
  <v-theme-provider theme="dark">
    <v-alert :color="color" :rounded="tile && '0'" closable v-model="alertVisible">
      <div class="text-subtitle-1">
        {{message}}
        <v-btn variant="outlined" size="small" v-if="!!detailedMessage" @click="detailedMessageVisible = !detailedMessageVisible">
          Details
        </v-btn>
      </div>
      <transition name="fade">
        <div v-if="!!detailedMessageVisible">
          <code>{{detailedMessage}}</code>
        </div>
      </transition>
    </v-alert>
  </v-theme-provider>
</template>

<script>
export default {
  props: {
    message: {
      type: String,
      default: ''
    },
    detailedMessage: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      required: true
    },
    tile: {
      type: Boolean
    },
    dark: {
      type: Boolean,
      default: true
    }
  },
  emits: [
    'update:message',
    'update:detailed-message'
  ],
  data () {
    return {
      detailedMessageVisible: false
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
          this.$emit('update:detailed-message', undefined)
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity .5s;
  }
  .fade-enter-from,
  .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }
</style>
