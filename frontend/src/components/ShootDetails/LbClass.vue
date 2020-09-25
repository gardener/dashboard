<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    :title="name"
    toolbarColor="cyan darken-2"
    :popperKey="`lbclass_${name}`"
  >
    <template v-slot:popperRef>
      <v-chip small class="cursor-pointer mr-2" outlined color="cyan darken-2">{{name}}</v-chip>
    </template>
    <span class="font-weight-bold">Floating Subnet ID:</span>&nbsp;{{floatingSubnetID}}
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper'

export default {
  name: 'lb-class',
  components: {
    GPopper
  },
  props: {
    name: {
      type: String
    },
    floatingSubnetID: {
      type: String
    }
  }
}
</script>

<style lang="scss" scoped>
  .cursor-pointer ::v-deep .v-chip__content {
    cursor: pointer;
  }
</style>
