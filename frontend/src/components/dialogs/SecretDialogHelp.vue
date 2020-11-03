<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" max-width="750">
    <v-card>
      <v-img
        class="white--text align-center justify-start"
        height="90px"
        :src="backgroundSrc"
      >
        <v-card-title>
          <v-icon large dark>mdi-help-circle-outline</v-icon>
          <span class="headline ml-5">{{title}}</span>
        </v-card-title>
      </v-img>

      <v-card-text class="secret-dialog pa-4">
        <slot name="help-content"></slot>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn :class="textColor" text @click.native.stop="hide">
          Got it
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { textColor } from '@/utils'

export default {
  props: {
    title: {
      type: String,
      required: true
    },
    value: {
      type: Boolean,
      required: true
    },
    color: {
      type: String,
      required: true
    },
    backgroundSrc: {
      type: String,
      required: true
    }
  },
  computed: {
    visible: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    textColor () {
      return textColor(this.color)
    }
  },
  methods: {
    hide () {
      this.visible = false
    }
  }
}
</script>
