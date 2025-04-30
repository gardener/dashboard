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
  shootReadiness,
} = useShootItem()

const configStore = useConfigStore()
const shootStore = useShootStore()

const conditions = computed(() => {
  const conditions = shootReadiness.value
    .filter(condition => !!condition.lastTransitionTime)
    .map(condition => {
      const conditionDefaults = configStore.conditionForType(condition.type)
      return {
        ...conditionDefaults,
        ...condition,
        sortOrder: padStart(conditionDefaults.sortOrder, 8, '0'),
      }
    })
  return sortBy(conditions, 'sortOrder')
})

const errorCodeObjects = computed(() => {
  const allErrorCodes = errorCodesFromArray(conditions.value)
  return objectsFromErrorCodes(allErrorCodes)
})

const isStaleShoot = computed(() => {
  return !shootStore.isShootActive(shootUid.value)
})
</script>
