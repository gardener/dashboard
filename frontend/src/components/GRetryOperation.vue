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

<script>
import { mapActions } from 'pinia'

import { useAppStore } from '@/store'
import { shootItem } from '@/mixins/shootItem'
import { get } from '@/utils/lodash'

export default {
  mixins: [shootItem],
  inject: ['api', 'logger'],
  data () {
    return {
      retryingOperation: false,
    }
  },
  computed: {
    canRetry () {
      const reconcileScheduled = this.shootGenerationValue !== this.shootObservedGeneration && !!this.shootObservedGeneration

      return get(this.shootLastOperation, 'state') === 'Failed' &&
          !this.isShootReconciliationDeactivated &&
          !this.retryingOperation &&
          !reconcileScheduled
    },
  },
  methods: {
    ...mapActions(useAppStore, [
      'setError',
    ]),
    async onRetryOperation () {
      this.retryingOperation = true

      const namespace = this.shootNamespace
      const name = this.shootName

      const retryAnnotation = { 'gardener.cloud/operation': 'retry' }
      try {
        await this.api.addShootAnnotation({ namespace, name, data: retryAnnotation })
      } catch (err) {
        this.logger.error('failed to retry operation', err)

        this.setError(err)
      }
      this.retryingOperation = false
    },
  },
}
</script>
