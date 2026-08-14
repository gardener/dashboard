<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-condition-status-tags
    :conditions="conditions"
    :error-code-objects="errorCodeObjects"
    :show-status-text="showStatusText"
  >
    <template #condition="{ condition }">
      <g-condition-status-tag
        :condition="condition"
        :identifier="identifier"
        popover-key-prefix="g-seed-status-tag"
        :popper-placement="popperPlacement"
        :resource-name="seedName"
        :stale="isStaleShoot"
      />
    </template>
  </g-condition-status-tags>
</template>

<script setup>
import { toRefs } from 'vue'

import GConditionStatusTags from '@/components/GConditionStatusTags.vue'
import GConditionStatusTag from '@/components/GConditionStatusTag.vue'

import { useManagedSeedShoot } from '@/composables/useManagedSeedShootForSeed'
import { useSeedEffectiveConditions } from '@/composables/useSeedEffectiveConditions'
import { useSeedItem } from '@/composables/useSeedItem/index'
import { useStatusConditions } from '@/composables/useStatusConditions'

const props = defineProps({
  popperPlacement: {
    type: String,
  },
  showStatusText: {
    type: Boolean,
    default: false,
  },
  identifier: {
    type: String,
    required: true,
  },
  isStaleShoot: {
    type: Boolean,
    default: false,
  },
})
const {
  popperPlacement,
  showStatusText,
  identifier,
  isStaleShoot,
} = toRefs(props)

const {
  seedName,
  seedConditions,
} = useSeedItem()

const {
  managedSeedShootConditions,
} = useManagedSeedShoot()

const effectiveConditions = useSeedEffectiveConditions(seedConditions, managedSeedShootConditions)

const {
  conditions,
  errorCodeObjects,
} = useStatusConditions(effectiveConditions)
</script>
