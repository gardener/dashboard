<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-chip
    v-if="!!shortPurpose"
    v-tooltip:top="purpose"
    :variant="!isCritical ? 'tonal' : 'flat'"
    :text-color="textColor"
    color="primary"
    size="small"
    class="purpose-tag"
  >
    {{ shortPurpose }}
  </v-chip>
</template>

<script>
import toUpper from 'lodash/toUpper'

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
