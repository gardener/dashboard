<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu
    v-model="value"
    :close-on-content-click="false"
    :close-on-click="true"
    offset-y
    nudge-bottom="4"
  >
    <template v-slot:activator="{ on, attrs }">
      <div v-bind="attrs" v-on="on">
      <v-progress-circular
        v-if="btnLoading"
        indeterminate
        width="2"
        :color="color"
        :size="32"
        class="ma-2"
      >
        <icon-base :width="16" :icon-color="color">
          <component :is="subscribed ? 'connected' : 'disconnected'"/>
        </icon-base>
      </v-progress-circular>
      <v-btn
          v-else
          icon
          :color="color"
      >
        <icon-base :width="16" :icon-color="color">
          <component :is="subscribed ? 'connected' : 'disconnected'"/>
        </icon-base>
      </v-btn>
      </div>
    </template>
    <v-card>
      <v-alert dense text border="top" min-width="360" :color="color" class="pr-1 ma-0">
        <v-row no-gutters>
          <v-col align-self="center" class="grow mr-3">
            <div class="text-body-2">
              {{message}}
            </div>
            <div v-if="hint" class="text-caption">
              {{hint}}
            </div>
          </v-col>
          <template v-if="action">
            <v-col align-self="center" class="shrink">
              <v-btn text :color="color" @click="retry">
                {{action}}
              </v-btn>
            </v-col>
          </template>
          <v-col align-self="center" class="shrink">
            <v-btn icon :color="color" @click="close">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-alert>
    </v-card>
  </v-menu>
</template>

<script>
import { shootSubscription } from '@/mixins/shootSubscription'
import IconBase from '@/components/icons/IconBase'
import Connected from '@/components/icons/Connected'
import Disconnected from '@/components/icons/Disconnected'

export default {
  name: 'shoot-subscription-status',
  components: {
    IconBase,
    Connected,
    Disconnected
  },
  mixins: [shootSubscription],
  data () {
    return {
      value: false
    }
  },
  computed: {
    btnLoading () {
      return this.kind.startsWith('progress')
    }
  },
  methods: {
    close () {
      this.value = false
    }
  }
}
</script>
