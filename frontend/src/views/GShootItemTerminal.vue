<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-terminal-splitpanes
    style="background-color: #333;"
  />
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import { useAuthnStore } from '@/store/authn'
import { useShootStore } from '@/store/shoot'

import GTerminalSplitpanes from '@/components/GTerminalSplitpanes.vue'

import { useTerminalSplitpanes } from '@/composables/useTerminalSplitpanes'

export default {
  components: {
    GTerminalSplitpanes,
  },
  provide () {
    return {
      ...this.terminalSplitpanes,
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      if (!vm.isAdmin && !vm.hasShootWorkerGroups) {
        vm.$router.replace({ name: 'ShootItem', params: vm.$route.params })
      }
    })
  },
  setup () {
    const terminalSplitpanes = useTerminalSplitpanes()
    const { load } = terminalSplitpanes

    return {
      load,
      terminalSplitpanes,
    }
  },
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    shootItem () {
      return this.shootByNamespaceAndName(this.$route.params)
    },
    hasShootWorkerGroups () {
      return !!this.shootItem?.spec?.provider?.workers?.length
    },
  },
  mounted () {
    this.load()
  },
  methods: {
    ...mapActions(useShootStore, ['shootByNamespaceAndName']),
  },
}
</script>
