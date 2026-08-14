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
      <g-status-tag
        :condition="condition"
        :popper-placement="popperPlacement"
        :shoot-binding="shootCloudProviderBinding"
        :shoot-metadata="shootMetadata"
        :stale-shoot="isStaleShoot"
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
import GStatusTag from '@/components/GStatusTag.vue'

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
  shootMetadata,
  shootUid,
  shootReadiness,
} = useShootItem()

const shootStore = useShootStore()

const { conditions, errorCodeObjects } = useStatusConditions(shootReadiness)

const isStaleShoot = computed(() => {
  return !shootStore.isShootActive(shootUid.value)
})
</script>
