<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-if="footerTemplate"
    v-html="footerHtml"
  />
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-else-if="hasFooter"
    class="text-caption text-center"
  >
    <span class="text-primary">
      Discover what our service is about at the
    </span>
    <a
      :href="landingPageUrl"
      target="_blank"
      rel="noopener"
      class="text-anchor"
    >
      {{ branding.productName }} Landing Page
    </a>
  </div>
</template>

<script>
import { mapState } from 'pinia'

import { useLoginStore } from '@/store/login'

import { omitKeysWithSuffix } from '@/utils'

import template from 'lodash/template'

export default {
  computed: {
    ...mapState(useLoginStore, [
      'landingPageUrl',
      'branding',
    ]),
    hasFooter () {
      return !!this.landingPageUrl && ![false, null, ''].includes(this.footerTemplate)
    },
    footerTemplate () {
      return this.branding.loginFooterTemplate
    },
    compiledFooterTemplate () {
      return template(this.footerTemplate, {
        interpolate: /{{([\s\S]+?)}}/g,
      })
    },
    footerHtml () {
      const data = omitKeysWithSuffix(this.branding, 'Template')
      data.landingPageUrl = this.landingPageUrl
      return this.compiledFooterTemplate(data)
    },
  },
}
</script>
