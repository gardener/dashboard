<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog v-model="visible" max-width="750">
    <v-card>
      <card-svg-title svg-title>
        <template v-slot:svgComponent>
            <secret-background></secret-background>
        </template>
        <v-icon color="accentTitle" large>mdi-help-circle-outline</v-icon>
        <span class="headline ml-5 accentTitle--text">{{title}}</span>
      </card-svg-title>
      <v-card-text class="secret-dialog pa-4">
        <slot name="help-content"></slot>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click.native.stop="hide">
          Got it
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import SecretBackground from '@/components/backgrounds/SecretBackground.vue'
import CardSvgTitle from '@/components/CardSvgTitle.vue'

export default {
  components: {
    SecretBackground,
    CardSvgTitle
  },
  props: {
    title: {
      type: String,
      required: true
    },
    value: {
      type: Boolean,
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
    }
  },
  methods: {
    hide () {
      this.visible = false
    }
  }
}
</script>
