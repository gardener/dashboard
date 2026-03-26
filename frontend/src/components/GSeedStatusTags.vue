<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="d-flex flex-nowrap justify-start"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <g-seed-status-tag
      v-for="condition in conditions"
      :key="condition.type"
      :seed-name="seedName"
      :condition="condition"
      :popper-placement="popperPlacement"
      :identifier="identifier"
      :stale-shoot="isStaleShoot"
      :container-hovered="hovered"
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
  ref,
  onBeforeUnmount,
  toRefs,
} from 'vue'

import GSeedStatusTag from '@/components/GSeedStatusTag.vue'
import GExternalLink from '@/components/GExternalLink.vue'

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

const hovered = ref(false)
let collapseTimer = null

function onMouseEnter () {
  clearTimeout(collapseTimer)
  hovered.value = true
}

function onMouseLeave () {
  collapseTimer = setTimeout(() => {
    hovered.value = false
  }, 1500)
}

onBeforeUnmount(() => {
  clearTimeout(collapseTimer)
})
</script>
