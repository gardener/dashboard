<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-checkbox
      v-model="enableStaticTokenKubeconfig"
      label="Enable static token kubeconfig (not recommended)"
      color="primary"
      hide-details
    />
    <div class="text-caption mt-1">
      There are more
      <g-external-link
        class="text-caption"
        url="https://github.com/gardener/gardener/blob/master/docs/usage/shoot_access.md"
      >
        secure alternatives
      </g-external-link>
      to access the Shoot cluster.
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

import GExternalLink from '@/components/GExternalLink.vue'

export default defineComponent({
  components: {
    GExternalLink,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'update:modelValue',
  ],
  computed: {
    enableStaticTokenKubeconfig: {
      get () {
        return this.modelValue
      },
      set (val) {
        this.$emit('update:modelValue', val)
      },
    },
  },
})
</script>
