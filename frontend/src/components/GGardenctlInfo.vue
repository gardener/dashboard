<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="popover"
    :z-index="2500"
    placement="bottom"
    toolbar-title="Gardenctl Info"
  >
    <template #activator="{ props }">
      <g-action-button
        v-bind="props"
        icon="mdi-information-outline"
        tooltip="Show information about gardenctl"
        :tooltip-disabled="popover"
      />
    </template>
    <template #text>
      <div class="text-h6 text-grey-darken-1 mb-4">Gardenctl</div>
      <p>
        <span class="font-family-monospace">gardenctl</span>
        is a command-line client for the Gardener.
        It facilitates the administration of one or many garden, seed and shoot clusters.
        Use this tool to configure access to clusters and configure cloud provider CLI tools.
        It also provides support for accessing cluster nodes via ssh.
      </p>
      <p>
        If not already done
        <g-external-link url="https://github.com/gardener/gardenctl-v2#installation">install</g-external-link>
        <span class="font-family-monospace pl-1">gardenctl</span> and
        <g-external-link url="https://github.com/gardener/gardenctl-v2#configuration">configure</g-external-link>
        it accordingly.
      </p>
      <g-gardenctl-config-example/>
    </template>
  </g-popover>
</template>

<script>
import GGardenctlConfigExample from '@/components/GGardenctlConfigExample.vue'

export default {
  components: {
    GGardenctlConfigExample,
  },
  data () {
    return {
      popover: false,
    }
  },
}
</script>
