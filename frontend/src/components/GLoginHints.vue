<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <div
    v-if="items.length"
    class="d-flex align-center justify-center"
    :style="{
      minHeight: `${minHeight}px`,
    }"
  >
    <v-breadcrumbs
      :items="items"
      density="compact"
      class="text-caption text-anchor"
      divider="&bull;"
    />
  </div>
</template>

<script>
import { mapState } from 'pinia'

import { useLoginStore } from '@/store/login'

export default {
  props: {
    minHeight: {
      type: Number,
      default: 38,
    },
  },
  computed: {
    ...mapState(useLoginStore, [
      'branding',
    ]),
    items () {
      const items = this.branding.loginHints ?? []
      return items.map(item => {
        const { title, href, disabled = false } = item
        return { title, href, disabled }
      })
    },
  },
}
</script>

<style lang="scss" scoped>
  :deep(.v-breadcrumbs-item), :deep(.v-breadcrumbs-divider) {
    letter-spacing: 0.5px;
  }
</style>
