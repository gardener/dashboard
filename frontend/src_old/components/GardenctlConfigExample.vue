<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div class="text-h6 text-grey-darken-1 my-4">Configuration</div>
    The following is a sample configuration for <span class="font-family-monospace pl-1">gardenlogin</span> as well as <span class="font-family-monospace pl-1">gardenctl</span>.
    Place the file under <code>~/.garden/gardenctl-v2.yaml</code>.
    <code-block lang="yaml" :content="gardenctlConfigYaml" :show-copy-button="true"></code-block>
    <div class="mt-2">
      Alternatively, you can run the following <span class="font-family-monospace pl-1">gardenctl</span> command:
    </div>
     <code-block lang="shell" :content="`$ ${configCmd}`" :clipboard="configCmd" :show-copy-button="true"></code-block>
    <div class="mt-2">
      <v-icon class="pb-1" size="small">mdi-information-outline</v-icon>
      Note that the
      <span class="font-family-monospace">kubeconfig</span>
      refers to the path of the garden cluster
      <span class="font-family-monospace">kubeconfig</span>
      which you can download from the <router-link :to="accountRoute">Account</router-link> page.
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import CodeBlock from '@/components/CodeBlock.vue'

export default {
  components: {
    CodeBlock
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    accountRoute () {
      return {
        name: 'Account'
      }
    },
    gardenctlConfigYaml () {
      return `gardens:
  - identity: ${this.cfg.clusterIdentity}
    kubeconfig: "<path-to-garden-cluster-kubeconfig>"`
    },
    configCmd () {
      return `gardenctl config set-garden ${this.cfg.clusterIdentity} --kubeconfig "<path-to-garden-cluster-kubeconfig>"`
    }
  }
}
</script>
