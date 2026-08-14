<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-condition-status-tag
    :condition="condition"
    :identifier="shootMetadata.uid || ''"
    popover-key-prefix="g-status-tag"
    :popper-placement="popperPlacement"
    :shoot-binding="shootBinding"
    :stale="staleShoot"
  />
</template>

<script setup>
import GConditionStatusTag from '@/components/GConditionStatusTag.vue'

defineProps({
  condition: {
    type: Object,
    required: true,
  },
  shootBinding: {
    type: Object,
  },
  popperPlacement: {
    type: String,
  },
  staleShoot: {
    type: Boolean,
  },
  shootMetadata: {
    type: Object,
    default: () => ({ uid: '' }),
  },
})
</script>
