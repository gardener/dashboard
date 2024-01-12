<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="popover"
    :z-index="2500"
    placement="bottom"
    toolbar-title="Gardenlogin Info"
  >
    <template #activator="{ props }">
      <g-action-button
        v-bind="props"
        icon="mdi-information-outline"
        tooltip="Show information about gardenlogin"
        :tooltip-disabled="popover"
      />
    </template>
    <template #text>
      <div class="text-h6 text-grey-darken-1 mb-4">
        Gardenlogin
      </div>
      <p>
        <span class="font-family-monospace">gardenlogin</span>
        is a kubectl credential plugin.
        It will transparently handle the authentication for the downloaded
        <span class="font-family-monospace">kubeconfig</span>.
      </p>
      <p>
        If not already done
        <g-external-link url="https://github.com/gardener/gardenlogin#installation">
          install
        </g-external-link>
        <span class="font-family-monospace pl-1">gardenlogin</span> and
        <g-external-link url="https://github.com/gardener/gardenlogin#configure-gardenlogin">
          configure
        </g-external-link>
        it accordingly.
      </p>
      <g-gardenctl-config-example :shoot-namespace="shootNamespace" />
    </template>
  </g-popover>
</template>

<script>
import GGardenctlConfigExample from './GGardenctlConfigExample.vue'

export default {
  components: {
    GGardenctlConfigExample,
  },
  props: {
    shootNamespace: {
      type: String,
    },
  },
  data () {
    return {
      popover: false,
    }
  },
}
</script>
