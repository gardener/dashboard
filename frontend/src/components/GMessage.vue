<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-expand-transition appear>
    <v-alert :color="color" :tile="tile" :dark="dark" dismissible v-model="alertVisible">
      <div class="text-subtitle-1">
        {{message}}
        <v-btn dark outlined small v-if="!!detailedMessage" @click="detailedMessageVisible = !detailedMessageVisible">
          Details
        </v-btn>
      </div>
      <transition name="fade">
        <div v-if="!!detailedMessageVisible">
          <code>{{detailedMessage}}</code>
        </div>
      </transition>
    </v-alert>
  </v-expand-transition>
</template>

<script>
export default {
  props: {
    message: {
      type: String
    },
    detailedMessage: {
      type: String
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
  .fade-enter-active, .fade-leave-active {
    transition: opacity .5s;
  }
  .fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }
</style>
