<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

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
        :identifier="shootUid"
        popover-key-prefix="g-status-tag"
        :popper-placement="popperPlacement"
        :shoot-binding="shootCloudProviderBinding"
        :stale="isStaleShoot"
      />
    </template>
  </g-condition-status-tags>
</template>

<script setup>
import {
  computed,
  toRefs,
} from 'vue'

import { useShootStore } from '@/store/shoot'

import GConditionStatusTags from '@/components/GConditionStatusTags.vue'
import GConditionStatusTag from '@/components/GConditionStatusTag.vue'

import { useShootItem } from '@/composables/useShootItem'
import { useStatusConditions } from '@/composables/useStatusConditions'

const props = defineProps({
  popperPlacement: {
    type: String,
  },
  showStatusText: {
    type: Boolean,
    default: false,
  },
})
const {
  popperPlacement,
  showStatusText,
} = toRefs(props)

const {
  shootCloudProviderBinding,
  shootUid,
  shootReadiness,
} = useShootItem()

const shootStore = useShootStore()

const { conditions, errorCodeObjects } = useStatusConditions(shootReadiness)

const isStaleShoot = computed(() => {
  return !shootStore.isShootActive(shootUid.value)
})
</script>
