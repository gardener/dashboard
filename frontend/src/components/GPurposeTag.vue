<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top">
    <template #activator="{ props }">
      <v-chip
        v-if="!!shortPurpose"
        v-bind="props"
        :variant="!isCritical ? 'outlined' : 'flat'"
        :text-color="textColor"
        color="primary"
        size="small"
        class="purpose-tag"
      >
        {{ shortPurpose }}
      </v-chip>
    </template>
    <span>{{ purpose }}</span>
  </v-tooltip>
</template>

<script>
import { toUpper } from '@/utils/lodash'

export default {
  props: {
    purpose: {
      type: String,
    },
  },
  computed: {
    shortPurpose () {
      switch (this.purpose) {
        case 'evaluation':
          return 'EVAL'
        case 'development':
          return 'DEV'
        case 'production':
          return 'PROD'
        case 'infrastructure':
          return 'INFRA'
        case 'testing':
          return 'TEST'
        default:
          return toUpper(this.purpose)
      }
    },
    isCritical () {
      return this.purpose === 'production' || this.purpose === 'infrastructure'
    },
    textColor () {
      if (!this.isCritical) {
        return 'primary'
      } else {
        return 'white'
      }
    },
  },
}
</script>

<style lang="scss" scoped>

  .purpose-tag {
    margin: 1px;
  }

  .purpose-tag :deep(.v-chip__content) {
    margin: -2px;
  }

</style>
