<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap justify-start">
    <g-status-tag
      v-for="condition in conditions"
      :key="condition.type"
      :condition="condition"
      :popper-placement="popperPlacement"
      :shoot-binding="shootCloudProviderBinding"
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

import { useConfigStore } from '@/store/config'
import { useShootStore } from '@/store/shoot'

import GStatusTag from '@/components/GStatusTag.vue'
import GExternalLink from '@/components/GExternalLink.vue'

import { useShootItem } from '@/composables/useShootItem'

import {
  objectsFromErrorCodes,
  errorCodesFromArray,
} from '@/utils/errorCodes'

import padStart from 'lodash/padStart'
import sortBy from 'lodash/sortBy'

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
  shootConditions,
  shootConstraints,
} = useShootItem()

const configStore = useConfigStore()
const shootStore = useShootStore()

/**
 * Merge an item (condition or constraint) with its default config,
 * apply status-mapping and padded sortOrder.
 */
function mergeItem (item) {
  const defaults = configStore.conditionForType(item.type) ?? {}

  return {
    ...item,
    ...defaults,
    sortOrder: padStart(defaults.sortOrder ?? '', 8, '0'),
  }
}

const conditions = computed(() => {
  const merged = []

  // helper to avoid repeating the same checks
  const pushIfValid = (item, mustNotBeTrue) => {
    item = mergeItem(item)
    if (!item.lastTransitionTime) {
      return
    }
    if (mustNotBeTrue && item.status === 'True') {
      return
    }
    merged.push(item)
  }

  for (const c of shootConditions.value) {
    pushIfValid(c, false)
  }
  for (const c of shootConstraints.value) {
    pushIfValid(c, true)
  }

  return sortBy(merged, 'sortOrder')
})

const errorCodeObjects = computed(() => {
  const allErrorCodes = errorCodesFromArray(conditions.value)
  return objectsFromErrorCodes(allErrorCodes)
})

const isStaleShoot = computed(() => {
  return !shootStore.isShootActive(shootUid.value)
})
</script>
