<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
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
