<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-checkbox
      v-model="enableStaticTokenKubeconfig"
      label="Enable static token kubeconfig"
      color="primary"
      hide-details
    ></v-checkbox>
    <div class="text-caption mt-1">It is <strong>not</strong> the recommended method to access the shoot cluster as the static token <code>kubeconfig</code> has some security flaws associated with it.</div>
    <div>
      <external-link class="text-caption" url="https://github.com/gardener/gardener/blob/master/docs/usage/shoot_access.md">More information</external-link>
    </div>
  </div>
</template>
<script>

import ExternalLink from '@/components/ExternalLink.vue'

export default {
  name: 'StaticTokenKubeconfigSwitch',
  components: {
    ExternalLink
  },
  props: {
    value: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    enableStaticTokenKubeconfig: {
      get () {
        return this.value
      },
      set (val) {
        this.$emit('input', val)
      }
    }
  }

}
</script>
