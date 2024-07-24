<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="bar"
    class="health-bar-container"
  >
    <div class="x-axis" />
    <div class="health-bar">
      <g-readiness-bar
        v-for="condition in conditions"
        :key="condition.type"
        :condition="condition"
        :popper-placement="popperPlacement"
        :secret-binding-name="shootSecretBindingName"
        :shoot-metadata="shootMetadata"
        :stale-shoot="isStaleShoot"
        :style="healthSegmentStyles"
      />
    </div>
  </div>
  <div
    v-else
    class="d-flex flex-nowrap justify-start"
  >
    <g-readiness-chip
      v-for="condition in conditions"
      :key="condition.type"
      :condition="condition"
      :popper-placement="popperPlacement"
      :secret-binding-name="shootSecretBindingName"
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
import { useAuthnStore } from '@/store/authn'

import GExternalLink from '@/components/GExternalLink.vue'

import { useShootItem } from '@/composables/useShootItem'

import {
  objectsFromErrorCodes,
  errorCodesFromArray,
} from '@/utils/errorCodes'

import GReadinessBar from './GReadinessBar.vue'
import GReadinessChip from './GReadinessChip.vue'

import {
  sortBy,
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
  bar: {
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
const authnStore = useAuthnStore()

const conditions = computed(() => {
  const conditions = shootReadiness.value
    .map(condition => {
      const conditionDefaults = configStore.conditionForType(condition.type)
      return {
        ...conditionDefaults,
        ...condition,
        sortOrder: padStart(conditionDefaults.sortOrder, 8, '0'),
      }
    })
    .filter(condition => !!condition.lastTransitionTime && (!condition.showAdminOnly || authnStore.isAdmin))
  return sortBy(conditions, 'sortOrder')
})

const errorCodeObjects = computed(() => {
  const allErrorCodes = errorCodesFromArray(conditions.value)
  return objectsFromErrorCodes(allErrorCodes)
})

const isStaleShoot = computed(() => {
  return !shootStore.isShootActive(shootUid.value)
})

const healthSegmentStyles = computed(() => ({
  width: `${100 / conditions.value.length}%`,
}))
</script>

<style scoped>
.health-bar-container {
  position: relative;
  height: 40px;
  width: 80px;
  background-color: rgba(var(--v-border-color), .05);
}
.health-bar {
  display: flex;
}

.x-axis {
  position: absolute;
  bottom: 19px;
  height: 2px;
  left: 1px;
  right: 1px;
  background-color: rgba(var(--v-border-color), .5);
  z-index: 0;
}

</style>
