<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <g-error
    :code="code"
    :text="text"
    :message="message"
    :button-text="buttonText"
    @click="onClick"
  ></g-error>
</template>

<script setup>
import { toRefs } from 'vue'
import { useRouter } from 'vue-router'
import GError from '@/components/GError.vue'

const router = useRouter()

const props = defineProps({
  code: {
    type: [String, Number],
    default: '404',
  },
  text: {
    type: String,
    default: 'Project not found',
  },
  message: {
    type: String,
    default: 'The project you are looking for doesn\'t exist or an other error occured!',
  },
  buttonText: {
    type: String,
    default: 'Get me out of here',
  },
  fallbackRoute: {
    type: Object,
    default () {
      return {
        name: 'Home',
      }
    },
  },
})

const { code, text, message, buttonText } = toRefs(props)

async function onClick () {
  try {
    await router.push(props.fallbackRoute)
  } catch (err) {
    /* Catch and ignore navigation aborted errors. Redirection happens in navigation guards (see https://router.vuejs.org/guide/essentials/navigation.html#router-push-location-oncomplete-onabort). */
  }
}
</script>
