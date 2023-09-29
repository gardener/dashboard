<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-if="teaserTemplate"
    v-html="teaserHtml"
  />
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-else
    class="d-flex flex-column align-center justify-center bg-main-background-darken-1 pa-3"
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
    <div class="text-h5 text-center font-weight-light text-primary mt-4">
      {{ branding.productSlogan }}
    </div>
  </div>
</template>

<script>
import { mapState } from 'pinia'

import { useLoginStore } from '@/store/login'

import {
  template,
  omit,
} from '@/lodash'

export default {
  props: {
    minHeight: {
      type: Number,
      default: 280,
    },
  },
  computed: {
    ...mapState(useLoginStore, [
      'landingPageUrl',
      'branding',
    ]),
    teaserTemplate () {
      return this.branding.loginTeaserTemplate
    },
    compiledTeaserTemplate () {
      return template(this.teaserTemplate, {
        interpolate: /{{([\s\S]+?)}}/g,
      })
    },
    teaserHtml () {
      const data = omit(this.branding, Object.keys(this.branding).filter(key => key.endsWith('Template')))
      data.minHeight = this.minHeight
      data.landingPageUrl = this.landingPageUrl
      return this.compiledTeaserTemplate(data)
    },
    logoSize () {
      return this.minHeight - 100
    },
  },
}
</script>
