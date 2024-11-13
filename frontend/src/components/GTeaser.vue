<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <div
    class="g-teaser bg-main-background-darken-2"
    :style="{
      height: `${teaserHeight}px`,
    }"
  >
    <slot />
    <!-- eslint-disable vue/no-v-html -->
    <div
      v-if="teaserTemplate"
      v-html="teaserHtml"
    />
    <!-- eslint-enable vue/no-v-html -->
    <div
      v-else
      class="g-teaser__content"
    >
      <div class="text-center mt-6">
        <a
          href="/"
          class="text-decoration-none"
        >
          <img
            :src="branding.productLogoUrl"
            height="80"
            :alt="`${branding.productName} Logo`"
            class="pointer-events-none"
          >
          <div
            v-if="branding.productTitle"
            class="g-teaser-title text-main-navigation-title"
          >
            {{ branding.productTitle }}
            <sup
              v-if="branding.productTitleSuperscript"
              class="text-truncate"
            >
              {{ branding.productTitleSuperscript }}
            </sup>
          </div>
          <div
            v-if="branding.productSlogan"
            class="g-teaser-subtitle text-primary"
          >
            {{ branding.productSlogan }}
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'pinia'

import { useConfigStore } from '@/store/config'

import { omitKeysWithSuffix } from '@/utils'

import template from 'lodash/template'

export default {
  computed: {
    ...mapState(useConfigStore, [
      'branding',
    ]),
    teaserTemplate () {
      return this.branding.teaserTemplate
    },
    compiledTeaserTemplate () {
      return template(this.teaserTemplate, {
        interpolate: /{{([\s\S]+?)}}/g,
      })
    },
    teaserHtml () {
      const data = omitKeysWithSuffix(this.branding, 'Template')
      return this.compiledTeaserTemplate(data)
    },
    teaserHeight () {
      return this.branding.teaserHeight ?? 200
    },
  },
}
</script>

<style lang="scss">
.g-teaser {
  overflow: hidden;

  .g-teaser__content {
    overflow: hidden;
  }

  .g-teaser-title {
    font-size: 40px;
    font-weight: 100;
    line-height: 40px;
    letter-spacing: 4px;
    padding-top: 8px;
    margin: 0;
    position: relative;
  }

  .g-teaser-title > sup {
    font-size: 10px;
    letter-spacing: 2px;
    line-height: 10px;
    position: absolute;
    top: 2px;
    right: 16px;
    max-width: 70%;
  }

  .g-teaser-subtitle {
    font-size: 15px;
    font-weight: 300;
    letter-spacing: 0.8px;
    padding: 0;
    margin: 0;
  }
}
</style>
