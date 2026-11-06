<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <div
    v-if="teaserTemplate"
    v-safe-html="{ html: teaserHtml, allowStyleTags: true }"
  />
  <div
    v-else
    class="v-theme--dark d-flex flex-column align-center justify-center bg-main-background-darken-1 pa-3"
    :style="{
      minHeight: `${minHeight}px`,
    }"
  >
    <img
      :src="branding.productLogoUrl"
      :alt="`Login to ${branding.productName}`"
      :width="logoSize"
      :height="logoSize"
      class="mt-2"
    >
    <div class="text-headline-small text-center font-weight-light text-primary mt-4">
      {{ branding.productSlogan }}
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  inject,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useLoginStore } from '@/store/login'

import {
  omitKeysWithSuffix,
  renderTemplate,
} from '@/utils'

const props = defineProps({
  minHeight: {
    type: Number,
    default: 280,
  },
})
const {
  landingPageUrl,
  branding,
} = storeToRefs(useLoginStore())

const sanitizeUrl = inject('sanitizeUrl')

const teaserTemplate = computed(() => branding.value.loginTeaserTemplate)
const teaserHtml = computed(() => {
  const data = omitKeysWithSuffix(branding.value, 'Template')
  data.minHeight = props.minHeight
  data.landingPageUrl = landingPageUrl.value ? sanitizeUrl(landingPageUrl.value) : undefined
  return renderTemplate(teaserTemplate.value, data)
})

const logoSize = computed(() => props.minHeight - 100)

</script>
