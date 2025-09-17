<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-btn
    v-if="canRetry"
    v-tooltip:top="'Retry Operation'"
    density="comfortable"
    variant="text"
    icon="mdi-reload"
    color="primary"
    @click="onRetryOperation"
  />
</template>

<script setup>
import {
  ref,
  computed,
  inject,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz.js'

import { useShootItem } from '@/composables/useShootItem'

import get from 'lodash/get'

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

const authzStore = useAuthzStore()
const {
  canPatchShoots,
} = storeToRefs(authzStore)

const canRetry = computed(() => {
  if (!canPatchShoots.value) {
    return false
  }

  const reconcileScheduled = shootGeneration.value !== shootObservedGeneration.value && !!shootObservedGeneration.value

  return get(shootLastOperation.value, ['state']) === 'Failed' &&
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
    appStore.setError(err)
    logger.error('failed to retry operation', err)
  } finally {
    retryingOperation.value = false
  }
}

</script>
