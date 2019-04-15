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
          @input="onInputAddons"></v-checkbox>
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
import find from 'lodash/find'
import concat from 'lodash/concat'
import reduce from 'lodash/reduce'
import set from 'lodash/set'
import filter from 'lodash/filter'

const standardAddonDefinitionList = [
  {
    name: 'kubernetes-dashboard',
    title: 'Dashboard',
    description: 'General-purpose web UI for Kubernetes clusters',
    visible: true,
    enabled: true
  },
  {
    name: 'nginx-ingress',
    title: 'Nginx Ingress (Deprecated)',
    description: 'This add-on is deprecated and will be removed in the future. You can install it or an alternative ingress controller always manually. If you choose to install it with the cluster, please note that Gardener will include it in its reconciliation and you can’t configure or override it’s configuration.',
    visible: true,
    enabled: true
  }
]

export default {
  name: 'create-shoot-addons',
  components: {
  },
  props: {

  },
  data () {
    return {
      addons: reduce(standardAddonDefinitionList, (addons, { name, enabled }) => set(addons, name, { enabled }), {})
    }
  },
  computed: {
    ...mapGetters([
      'customAddonDefinitionList',
      'projectList'
    ]),
    ...mapState([
      'namespace'
    ]),
    addonDefinitionList () {
      const project = find(this.projectList, ['metadata.namespace', this.namespace])
      const customAddons = /#enableCustomAddons/i.test(project.data.purpose) ? this.customAddonDefinitionList : []
      return concat(filter(standardAddonDefinitionList, 'visible'), customAddons)
    }
  },
  methods: {
    onInputAddons () {
      // this.$emit('updateAddons', this.addons)
    },
    getAddons () {
      return this.addons
    }
  }
}
</script>
