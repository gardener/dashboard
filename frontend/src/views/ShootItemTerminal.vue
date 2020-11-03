<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <!-- TODO on shootsubscription done do not fetch seedInfo -->
  <terminal-splitpanes
    ref="terminalSplitpanes"
    :name="name"
    :namespace="namespace"
    :target="target"
    style="background-color: #333;"
  ></terminal-splitpanes>
</template>

<script>
import get from 'lodash/get'
import TerminalSplitpanes from '@/components/TerminalSplitpanes'
import { mapGetters } from 'vuex'

export default {
  components: {
    TerminalSplitpanes
  },
  computed: {
    ...mapGetters([
      'shootByNamespaceAndName'
    ]),
    name () {
      return get(this.$route.params, 'name')
    },
    namespace () {
      return get(this.$route.params, 'namespace')
    },
    target () {
      return get(this.$route.params, 'target')
    }
  },
  mounted () {
    this.$refs.terminalSplitpanes.load()
  }
}

</script>

<style lang="scss" scoped>
</style>
