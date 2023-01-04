<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <code-block lang="yaml" :content="gardenctlV2ConfigYaml" :show-copy-button="true"></code-block>
    <p class="mt-2">
      Please note that the
      <span class="font-family-monospace">kubeconfig</span>
      property refers to the path of the garden cluster
      <span class="font-family-monospace">kubeconfig</span>
      which you can download from the <router-link :to="accountRoute">Account</router-link> page.
    </p>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import CodeBlock from '@/components/CodeBlock'

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
        name: 'Account',
        query: { namespace: this.shootNamespace }
      }
    },
    gardenctlV2ConfigYaml () {
      return `# place config under ~/.garden/gardenctl-v2.yaml
# to share the same config with gardenlogin and gardenctl-v2
gardens:
  - identity: ${this.cfg.clusterIdentity}
    kubeconfig: "<path-to-garden-cluster-kubeconfig>"`
    }
  }
}
</script>
