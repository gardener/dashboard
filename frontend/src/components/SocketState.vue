<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip left open-delay="500">
    <template v-slot:activator="{ on, attrs }">
      <div v-bind="attrs" v-on="on" class="d-flex justify-center align-center wrapper">
        <v-progress-circular
          v-if="!connected && active"
          indeterminate
          :size="32"
          :width="1"
          color="primary"
        >
          <icon-base
            :width="16"
            icon-color="primary"
          >
            <disconnected/>
          </icon-base>
        </v-progress-circular>
        <icon-base
          v-else
          :width="16"
          :icon-color="color"
        >
          <component :is="tag"/>
        </icon-base>
      </div>
    </template>
    <span>{{ readyState }}</span>
  </v-tooltip>
</template>

<script>
import { mapState } from 'vuex'
import IconBase from '@/components/icons/IconBase'
import Connected from '@/components/icons/Connected'
import Disconnected from '@/components/icons/Disconnected'

export default {
  name: 'socket-state',
  components: {
    IconBase,
    Connected,
    Disconnected
  },
  data () {
    return {
    }
  },
  computed: {
    ...mapState('socket', [
      'connected',
      'readyState',
      'active'
    ]),
    color () {
      return this.connected
        ? 'primary'
        : 'error'
    },
    tag () {
      return this.connected
        ? 'connected'
        : 'disconnected'
    }
  }
}
</script>

<style lang="scss" scoped>
  .wrapper {
    width: 32px !important;
    height: 32px !important;
  }
</style>
