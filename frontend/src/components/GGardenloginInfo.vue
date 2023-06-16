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
      <g-action-button
        icon="mdi-information-outline"
        tooltip="Show information about gardenlogin"
      />
    </template>
    <div class="text-h6 text-grey-darken-1 mb-4">Gardenlogin</div>
    <p>
      <span class="font-family-monospace">gardenlogin</span>
      is a kubectl credential plugin.
      It will transparently handle the authentication for the downloaded
      <span class="font-family-monospace">kubeconfig</span>.
    </p>
    <p>
      If not already done
      <g-external-link url="https://github.com/gardener/gardenlogin#installation">install</g-external-link>
      <span class="font-family-monospace pl-1">gardenlogin</span> and
      <g-external-link url="https://github.com/gardener/gardenlogin#configure-gardenlogin">configure</g-external-link>
      it accordingly.
    </p>
    <g-gardenctl-config-example/>
  </g-popper>
</template>

<script>
import GPopper from './GPopper.vue'
import GGardenctlConfigExample from './GGardenctlConfigExample.vue'
import GExternalLink from './GExternalLink.vue'
import GActionButton from './GActionButton.vue'

export default {
  components: {
    GPopper,
    GGardenctlConfigExample,
    GExternalLink,
    GActionButton,
  },
}
</script>

<style lang="scss" scoped>
  :deep(.popper) {
    text-align: initial;
  }
</style>
