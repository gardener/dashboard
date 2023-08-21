<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div class="text-h6 text-grey-darken-1 my-4">
      Configuration
    </div>
    The following is a sample configuration for
    <span class="font-family-monospace pl-1">gardenlogin</span>
    as well as
    <span class="font-family-monospace pl-1">gardenctl</span>.
    Place the file under
    <code>~/.garden/gardenctl-v2.yaml</code>.
    <g-code-block
      lang="yaml"
      :content="gardenctlConfigYaml"
      :show-copy-button="true"
    />
    <div class="mt-2">
      Alternatively, you can run the following
      <span class="font-family-monospace pl-1">gardenctl</span>
      command:
    </div>
    <g-code-block
      lang="shell"
      :content="`$ ${configCmd}`"
      :clipboard="configCmd"
      :show-copy-button="true"
    />
    <div class="mt-2">
      <v-icon
        icon="mdi-information-outline"
        class="pb-1"
        size="small"
      />
      Note that the
      <span class="font-family-monospace">kubeconfig</span>
      refers to the path of the garden cluster
      <span class="font-family-monospace">kubeconfig</span>
      which you can download from the
      <router-link
        :to="accountRoute"
        class="text-anchor"
      >
        Account
      </router-link>
      page.
    </div>
  </div>
</template>

<script>
import { mapState } from 'pinia'

import { useConfigStore } from '@/store/config'

import GCodeBlock from './GCodeBlock.vue'

export default {
  components: {
    GCodeBlock,
  },
  computed: {
    ...mapState(useConfigStore, [
      'clusterIdentity',
    ]),
    accountRoute () {
      return {
        name: 'Account',
      }
    },
    gardenctlConfigYaml () {
      return `gardens:
  - identity: ${this.clusterIdentity}
    kubeconfig: "<path-to-garden-cluster-kubeconfig>"`
    },
    configCmd () {
      return `gardenctl config set-garden ${this.clusterIdentity} --kubeconfig "<path-to-garden-cluster-kubeconfig>"`
    },
  },
}
</script>
