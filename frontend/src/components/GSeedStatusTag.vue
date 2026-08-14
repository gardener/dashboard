<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-condition-status-tag
    :condition="condition"
    :identifier="identifier"
    popover-key-prefix="g-seed-status-tag"
    :popper-placement="popperPlacement"
    :resource-name="seedName"
    :stale="staleShoot"
  />
</template>

<script setup>
import GConditionStatusTag from '@/components/GConditionStatusTag.vue'

defineProps({
  seedName: {
    type: String,
    required: true,
  },
  condition: {
    type: Object,
    required: true,
  },
  popperPlacement: {
    type: String,
  },
  staleShoot: {
    type: Boolean,
  },
  identifier: {
    type: String,
    required: true,
  },
})
</script>
