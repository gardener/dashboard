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
      @change="onChange"
      hide-details
    ></v-checkbox>
    <span class="text-caption">It is <span class="font-weight-bold">not</span> the recommended method to access the shoot cluster as the static token <code>kubeconfig</code> has some security flaws associated with it.</span>
    <p>
      <external-link class="text-caption" url="https://github.com/gardener/gardener/blob/master/docs/usage/shoot_access.md">More information</external-link>
    </p>
  </div>
</template>
<script>

import ExternalLink from '@/components/ExternalLink.vue'

export default {
  name: 'AdminKubeconfig',
  components: {
    ExternalLink
  },
  props: {
    value: {
      type: Boolean
    }
  },
  data () {
    return {
      enableStaticTokenKubeconfig: undefined
    }
  },
  methods: {
    onChange (value) {
      this.$emit('input', value)
    }
  },
  watch: {
    value: function (value) {
      this.enableStaticTokenKubeconfig = value
    }
  }
}
</script>
