<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-checkbox
    v-model="enableStaticTokenKubeconfig"
    label="Enable Gardener provided static admin kubeconfig"
    color="primary"
    hint="If enabled, Gardener will create a kubeconfig with admin access to this cluster in the project namespace"
    persistent-hint
    @change="onChange"
  ></v-checkbox>
</template>

<script>

export default {
  name: 'AdminKubeconfig',
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
