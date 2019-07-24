<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-list three-line class="pa-0 ma-0">
    <v-list-tile class="list-complete-item ma-0"
      v-for="addonDefinition in addonDefinitionList"
      :key="addonDefinition.name">
      <v-list-tile-action>
        <v-checkbox
          color="cyan darken-2"
          v-model="addons[addonDefinition.name].enabled"
        ></v-checkbox>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-title >{{addonDefinition.title}}</v-list-tile-title>
        <v-list-tile-sub-title>{{addonDefinition.description}}</v-list-tile-sub-title>
      </v-list-tile-content>
    </v-list-tile>
  </v-list>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import reduce from 'lodash/reduce'
import set from 'lodash/set'
import filter from 'lodash/filter'
import assign from 'lodash/assign'
import cloneDeep from 'lodash/cloneDeep'
import { shootAddonList } from '@/utils'

export default {
  name: 'manage-shoot-addons',
  components: {
  },
  props: {

  },
  data () {
    return {
      addons: undefined,
      addonDefinitionList: undefined
    }
  },
  computed: {
    ...mapGetters([
      'projectList'
    ]),
    ...mapState([
      'namespace'
    ])
  },
  methods: {
    getAddons () {
      return cloneDeep(this.addons)
    },
    updateAddons (addons) {
      this.resetAddonList(addons)
      assign(this.addons, cloneDeep(this.addons))
    },
    resetAddonList (addons) {
      this.addonDefinitionList = filter(shootAddonList, addon => {
        return addon.visible === true || (addons && !!addons[addon.name])
      })
    }
  },
  mounted () {
    this.resetAddonList()
    this.addons = reduce(this.addonDefinitionList, (addons, { name, enabled }) => set(addons, name, { enabled }), {})
  }
}
</script>
