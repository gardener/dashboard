<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="!workerless"
    class="alternate-row-background"
  >
    <g-expand-transition-group :disabled="disableWorkerAnimation">
      <v-row
        v-for="worker in providerWorkers"
        :key="worker.id"
        class="list-item"
      >
        <g-worker-input-generic
          :worker="worker"
        >
          <template #action>
            <v-btn
              v-show="providerWorkers.length > 1"
              size="x-small"
              variant="tonal"
              icon="mdi-close"
              color="grey"
              @click.stop="removeProviderWorker(worker.id)"
            />
          </template>
        </g-worker-input-generic>
      </v-row>
    </g-expand-transition-group>
    <v-row
      key="addWorker"
      class="list-item my-1"
    >
      <v-col>
        <v-btn
          :disabled="!allMachineTypes.length"
          variant="text"
          color="primary"
          @click="addProviderWorker"
        >
          <v-icon class="text-primary">
            mdi-plus
          </v-icon>
          Add Worker Group
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import {
  mapActions,
  mapState,
} from 'pinia'

import { useShootContextStore } from '@/store/shootContext'

import GWorkerInputGeneric from '@/components/ShootWorkers/GWorkerInputGeneric'
import GExpandTransitionGroup from '@/components/GExpandTransitionGroup'

export default {
  components: {
    GWorkerInputGeneric,
    GExpandTransitionGroup,
  },
  props: {
    disableWorkerAnimation: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    ...mapState(useShootContextStore, [
      'providerWorkers',
      'workerless',
      'allMachineTypes',
    ]),
  },
  methods: {
    ...mapActions(useShootContextStore, [
      'addProviderWorker',
      'removeProviderWorker',
    ]),
  },
}
</script>
