<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <v-container
    fluid
    class="fill-height text-center"
  >
    <v-row align="center">
      <v-col>
        <h1>{{ code }}</h1>
        <h2>{{ text }}</h2>
        <p v-if="message">
          {{ message }}
        </p>
        <v-btn
          color="primary"
          class="mt-12"
          @click="onClick"
        >
          {{ buttonText }}
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { toRefs } from 'vue'
import { useAppStore } from '@/store'

const store = useAppStore

const props = defineProps({
  code: {
    type: [String, Number],
    default: '500',
  },
  text: {
    type: String,
    default: 'Unexpected Error :(',
  },
  message: {
    type: String,
    default: null,
  },
  buttonText: {
    type: String,
    default: 'Get me out of here',
  },
})

const { code, text, message, buttonText } = toRefs(props)

// events
const emit = defineEmits([
  'click',
])

// methods
function onClick () {
  emit('click', store.fromRoute)
}
</script>

<style lang="scss" scoped>
  h1 {
    font-size: 160px;
    line-height: 160px;
    font-weight: bold;
    color: #515151;
    margin-bottom: 0;
  }
  h2 {
    font-size: 36px;
    font-weight: 300;
    color: #999999;
  }
</style>
