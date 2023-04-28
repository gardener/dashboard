<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top" v-if="canRetry">
    <template v-slot:activator="{ on }">
      <v-btn v-on="on" icon variant="text" class="text-primary retryButton" @click="onRetryOperation">
        <v-icon>mdi-reload</v-icon>
      </v-btn>
    </template>
    Retry Operation
  </v-tooltip>
</template>

<script>
import get from 'lodash/get'
import { addShootAnnotation } from '@/utils/api'
import { shootItem } from '@/mixins/shootItem'

export default {
  data () {
    return {
      retryingOperation: false
    }
  },
  mixins: [shootItem],
  computed: {
    canRetry () {
      const reconcileScheduled = this.shootGenerationValue !== this.shootObservedGeneration && !!this.shootObservedGeneration

      return get(this.shootLastOperation, 'state') === 'Failed' &&
          !this.isShootReconciliationDeactivated &&
          !this.retryingOperation &&
          !reconcileScheduled
    }
  },
  methods: {
    async onRetryOperation () {
      this.retryingOperation = true

      const namespace = this.shootNamespace
      const name = this.shootName

      const retryAnnotation = { 'gardener.cloud/operation': 'retry' }
      try {
        await addShootAnnotation({ namespace, name, data: retryAnnotation })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('failed to retry operation', err)

        this.$store.dispatch('setError', err)
      }
      this.retryingOperation = false
    }
  }
}
</script>
