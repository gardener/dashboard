<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    v-if="canRetry"
    location="top"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        density="comfortable"
        variant="text"
        icon="mdi-reload"
        color="primary"
        @click="onRetryOperation"
      />
    </template>
    Retry Operation
  </v-tooltip>
</template>

<script setup>
import {
  ref,
  computed,
  inject,
} from 'vue'

import { useAppStore } from '@/store/app'

import { useShootItem } from '@/composables/useShootItem'

import { get } from '@/lodash'

const api = inject('api')
const logger = inject('logger')

const {
  shootNamespace,
  shootName,
  shootGeneration,
  shootObservedGeneration,
  shootLastOperation,
  isShootReconciliationDeactivated,
} = useShootItem()

const appStore = useAppStore()

const retryingOperation = ref(false)

const canRetry = computed(() => {
  const reconcileScheduled = shootGeneration.value !== shootObservedGeneration.value && !!shootObservedGeneration.value

  return get(shootLastOperation.value, 'state') === 'Failed' &&
    !isShootReconciliationDeactivated.value &&
    !retryingOperation.value &&
    !reconcileScheduled
})

async function onRetryOperation () {
  retryingOperation.value = true
  try {
    await api.addShootAnnotation({
      namespace: shootNamespace.value,
      name: shootName.value,
      data: {
        'gardener.cloud/operation': 'retry',
      },
    })
  } catch (err) {
    appStore.setError({
      text: err,
      duration: -1,
    })
    logger.error('failed to retry operation', err)
  } finally {
    retryingOperation.value = false
  }
}

</script>
