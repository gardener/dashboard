<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-collapsable-items
    :items="conditions"
    :uid="shootMetadata.uid"
    inject-key="expandedConditions"
    :collapse="collapse"
    no-wrap
  >
    <template #collapsed>
      <v-chip
        :color="collapsedChipColor"
        :variant="errorCount > 0 ? 'flat' : 'tonal'"
        size="small"
      >
        {{ collapsedChipText }}
        <v-tooltip
          location="top"
          activator="parent"
          :text="tooltipText"
        />
      </v-chip>
    </template>
    <template #item="{ item }">
      <g-status-tag
        :key="item.type"
        :condition="item"
        :popper-placement="popperPlacement"
        :secret-binding-name="shootSecretBindingName"
        :shoot-metadata="shootMetadata"
        :stale-shoot="isStaleShoot"
      />
    </template>
  </g-collapsable-items>
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
import GCollapsableItems from '@/components/GCollapsableItems'

import { useShootItem } from '@/composables/useShootItem'

import {
  objectsFromErrorCodes,
  errorCodesFromArray,
} from '@/utils/errorCodes'

import {
  sortBy,
  filter,
  isEmpty,
  padStart,
} from '@/lodash'

const props = defineProps({
  popperPlacement: {
    type: String,
  },
  showStatusText: {
    type: Boolean,
    default: false,
  },
  collapse: {
    type: Boolean,
    default: false,
  },
})
const {
  popperPlacement,
  showStatusText,
} = toRefs(props)

const {
  shootSecretBindingName,
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

const errorCount = computed(() => {
  return filter(conditions.value, condition => condition.status === 'False' || !isEmpty(condition.codes)).length
})

const unknownCount = computed(() => {
  return filter(conditions.value, ['status', 'Unknown']).length
})

const progressingCount = computed(() => {
  return filter(conditions.value, ['status', 'Progressing']).length
})

const tooltipText = computed(() => {
  if (errorCount.value > 0) {
    return 'Error'
  }
  if (unknownCount.value > 0) {
    return 'Unknown'
  }
  if (progressingCount.value > 0) {
    return 'Progressing'
  }
  return 'OK'
})

const collapsedChipColor = computed(() => {
  if (errorCount.value > 0) {
    return 'error'
  }
  if (unknownCount.value > 0) {
    return 'grey'
  }
  if (progressingCount.value > 0) {
    return 'info'
  }
  return 'primary'
})

const collapsedChipText = computed(() => {
  if (errorCount.value > 0) {
    return 'Error'
  }
  if (unknownCount.value > 0) {
    return 'Unknown'
  }
  if (progressingCount.value > 0) {
    return 'Progressing'
  }
  return 'OK'
})

</script>
