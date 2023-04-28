<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    title="Gardenlogin Info"
    popper-key="gardenlogin_info"
    placement="bottom"
  >
    <template v-slot:popperRef>
      <v-btn icon>
        <v-tooltip location="top">
          <template v-slot:activator="{ on }">
            <v-icon v-on="on" color="action-button">mdi-information-outline</v-icon>
          </template>
          <span>Show information about gardenlogin</span>
        </v-tooltip>
      </v-btn>
    </template>
      <div class="text-h6 text-grey-darken-1 mb-4">Gardenlogin</div>
      <p>
        <span class="font-family-monospace">gardenlogin</span> is a kubectl credential plugin. It will transparently handle the
        authentication for the downloaded <span class="font-family-monospace">kubeconfig</span>.
      </p>
      <p>
        If not already done <external-link url="https://github.com/gardener/gardenlogin#installation">install</external-link>
        <span class="font-family-monospace pl-1">gardenlogin</span> and
        <external-link url="https://github.com/gardener/gardenlogin#configure-gardenlogin">configure</external-link>
        it accordingly.
      </p>
      <gardenctl-config-example></gardenctl-config-example>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper.vue'
import GardenctlConfigExample from '@/components/GardenctlConfigExample.vue'
import ExternalLink from '@/components/ExternalLink.vue'

export default {
  components: {
    GPopper,
    GardenctlConfigExample,
    ExternalLink
  }
}
</script>

<style lang="scss" scoped>
  :deep(.popper) {
    text-align: initial;
  }
</style>
