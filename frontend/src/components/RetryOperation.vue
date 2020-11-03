<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="retry-operation-div" v-if="canRetry">
    <v-tooltip top>
      <template v-slot:activator="{ on }">
        <v-btn v-on="on" small icon text class="cyan--text text--darken-2 retryButton" @click="onRetryOperation">
          <v-icon>mdi-reload</v-icon>
        </v-btn>
      </template>
      Retry Operation
    </v-tooltip>
  </div>
</template>

<script>
import get from 'lodash/get'
import { addShootAnnotation } from '@/utils/api'
import { shootItem } from '@/mixins/shootItem'

export default {
  props: {
    shootItem: {
      type: Object
    }
  },
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
        console.log('failed to retry operation', err)

        this.$store.dispatch('setError', err)
      }
      this.retryingOperation = false
    }
  }
}
</script>

<style lang="scss" scoped>

.retry-operation-div {
  display: inline-block;
  width: 30px;
  text-align: center;
  height: auto;
  max-height:  30px;
}

.retryButton {
  margin: 0px;
}

</style>
