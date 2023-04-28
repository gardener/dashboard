<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
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
import TerminalSplitpanes from '@/components/TerminalSplitpanes.vue'

export default {
  components: {
    TerminalSplitpanes
  },
  computed: {
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
