<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
