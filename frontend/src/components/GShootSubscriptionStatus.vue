<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu
    v-model="modelValue"
    :close-on-content-click="false"
    :close-on-click="true"
    :persistent="false"
    :offset="[12, 4]"
    transition="slide-y-transition"
  >
    <template #activator="{ props }">
      <div v-bind="props">
        <v-progress-circular
          v-if="btnLoading"
          indeterminate
          width="2"
          :color="color"
          :size="32"
          class="ma-2"
        >
          <g-icon-base
            :width="16"
            :icon-color="color"
          >
            <component :is="iconName" />
          </g-icon-base>
        </v-progress-circular>
        <v-btn
          v-else
          icon
          :color="color"
        >
          <g-icon-base
            :width="16"
            :icon-color="color"
          >
            <component :is="iconName" />
          </g-icon-base>
        </v-btn>
      </div>
    </template>
    <v-card
      :rounded="0"
    >
      <v-alert
        density="compact"
        variant="tonal"
        border="start"
        :rounded="0"
        min-width="360"
        :color="color"
        class="pr-0 ma-0"
      >
        <v-row
          no-gutters
          class="ml-2"
        >
          <v-col
            align-self="center"
            class="grow mr-3"
          >
            <div class="text-body-2">
              {{ message }}
            </div>
            <div
              v-if="hint"
              class="text-caption"
            >
              {{ hint }}
            </div>
          </v-col>
          <template v-if="action">
            <v-col
              align-self="center"
              class="shrink flex-grow-0"
            >
              <v-btn
                variant="text"
                :color="color"
                @click="retry"
              >
                {{ action }}
              </v-btn>
            </v-col>
          </template>
          <v-col
            align-self="center"
            class="shrink flex-grow-0 mr-2"
          >
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              density="comfortable"
              :color="color"
              @click="close"
            />
          </v-col>
        </v-row>
      </v-alert>
    </v-card>
  </v-menu>
</template>

<script>
import { defineComponent } from 'vue'

import { shootSubscription } from '@/mixins/shootSubscription'

import GIconBase from '@/components/icons/GIconBase.vue'
import GConnected from '@/components/icons/GConnected.vue'
import GDisconnected from '@/components/icons/GDisconnected.vue'

export default defineComponent({
  components: {
    GIconBase,
    GConnected,
    GDisconnected,
  },
  mixins: [
    shootSubscription,
  ],
  data () {
    return {
      modelValue: false,
    }
  },
  computed: {
    iconName () {
      return this.connected && (!this.subscription || this.subscribed)
        ? 'g-connected'
        : 'g-disconnected'
    },
    btnLoading () {
      return this.kind.startsWith('progress')
    },
  },
  methods: {
    close () {
      this.modelValue = false
    },
  },
})
</script>
