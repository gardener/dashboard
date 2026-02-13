<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap justify-start">
    <g-seed-status-tag
      v-for="condition in conditions"
      :key="condition.type"
      :seed-name="seedName"
      :condition="condition"
      :popper-placement="popperPlacement"
      :shoot-metadata="shootMetadata"
      :stale-shoot="isStaleShoot"
    />
  </div>
  <template v-if="showStatusText">
    <div
      v-for="({ description, link }) in errorCodeObjects"
      :key="description"
      class="mt-1"
    >
      <div class="font-weight-bold text-error wrap-text">
        {{ description }}
      </div>
      <div v-if="link">
        <g-external-link
          :url="link.url"
          class="font-weight-bold text-error"
        >
          {{ link.text }}
        </g-external-link>
      </div>
    </div>
  </template>
</template>

<script setup>
import {
  computed,
  toRefs,
} from 'vue'

import { useShootStore } from '@/store/shoot'

import GSeedStatusTag from '@/components/GSeedStatusTag.vue'
import GExternalLink from '@/components/GExternalLink.vue'

import { useShootItem } from '@/composables/useShootItem'
import {
  useSeedItem,
  useSeedConditions,
} from '@/composables/useSeedItem'
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
  shootMetadata,
  shootUid,
} = useShootItem()

const {
  seedItem,
  seedName,
} = useSeedItem()
const seedConditions = useSeedConditions(seedItem)

const shootStore = useShootStore()

const isStaleShoot = computed(() => {
  return !shootStore.isShootActive(shootUid.value)
})

const { conditions, errorCodeObjects } = useStatusConditions(seedConditions)
</script>
