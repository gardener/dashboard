<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-list v-if="hasTerminalAccess">
    <terminal-list-tile 
      :name=name 
      :namespace=namespace 
      route-name="ShootItemTerminalCp" 
      description="Open terminal into cluster's control plane running on it's seed">
    </terminal-list-tile>
  </v-list>
</template>

<script>
import TerminalListTile from '@/components/TerminalListTile'
import { mapGetters } from 'vuex'
import get from 'lodash/get'

export default {
  components: {
    TerminalListTile
  },
  props: {
    item: {
      type: Object
    }
  },
  computed: {
    ...mapGetters([
      'hasTerminalAccess'
    ]),
    name () {
      return get(this.item, 'metadata.name')
    },
    namespace () {
      return get(this.item, 'metadata.namespace')
    }
  },
}
</script>
