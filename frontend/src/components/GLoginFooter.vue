<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-if="footerTemplate"
    v-html="footerHtml"
  />
  <div
    v-else-if="hasFooter"
    class="text-body-small text-center"
  >
    <span class="text-primary">
      Discover what our service is about at the
    </span>
    <a
      :href="sanitizeUrl(landingPageUrl)"
      target="_blank"
      rel="noopener noreferrer"
      class="text-anchor"
    >
      {{ branding.productName }} Landing Page
    </a>
  </div>
</template>

<script setup>
import {
  computed,
  inject,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useLoginStore } from '@/store/login'

import { omitKeysWithSuffix } from '@/utils'

import template from 'lodash/template'

const sanitizeUrl = inject('sanitizeUrl')

const loginStore = useLoginStore()

const { landingPageUrl, branding } = storeToRefs(loginStore)

const footerTemplate = computed(() => branding.value.loginFooterTemplate)
const hasFooter = computed(() => {
  return !!landingPageUrl.value && ![false, null, ''].includes(footerTemplate.value)
})

const compiledFooterTemplate = computed(() => {
  return template(footerTemplate.value, {
    interpolate: /{{([\s\S]+?)}}/g,
  })
})

const footerHtml = computed(() => {
  const data = omitKeysWithSuffix(branding.value, 'Template')
  data.landingPageUrl = landingPageUrl.value
  return compiledFooterTemplate.value(data)
})
</script>
