<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip top>
    <template v-slot:activator="{ on }">
      <v-chip v-on="on" class="purpose-tag" v-if="!!shortPurpose" :outlined="!isCritical" :text-color="textColor" color="cyan darken-2" small>{{ shortPurpose }}</v-chip>
    </template>
    <span>{{ purpose }}</span>
  </v-tooltip>
</template>

<script>
import toUpper from 'lodash/toUpper'

export default {
  props: {
    purpose: {
      type: String
    }
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
        return 'cyan darken-2'
      } else {
        return 'white'
      }
    }
  }
}
</script>

<style lang="scss" scoped>

  .purpose-tag {
    margin: 1px;
  }

  .purpose-tag ::v-deep .v-chip__content {
    margin: -4px;
  }

</style>
