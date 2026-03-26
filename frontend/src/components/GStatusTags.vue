<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="d-flex flex-nowrap justify-start"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <g-status-tag
      v-for="condition in conditions"
      :key="condition.type"
      :condition="condition"
      :popper-placement="popperPlacement"
      :shoot-binding="shootCloudProviderBinding"
      :shoot-metadata="shootMetadata"
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
  computed,
  ref,
  onBeforeUnmount,
  toRefs,
} from 'vue'

import { useShootStore } from '@/store/shoot'

import GStatusTag from '@/components/GStatusTag.vue'
import GExternalLink from '@/components/GExternalLink.vue'

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
