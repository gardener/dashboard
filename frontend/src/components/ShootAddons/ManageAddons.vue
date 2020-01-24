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
  <v-layout column>
    <v-flex xs12>
      <v-layout row v-for="addonDefinition in addonDefinitionList" :key="addonDefinition.name">
        <v-flex class="addon-action">
          <v-checkbox
            color="cyan darken-2"
            v-model="addons[addonDefinition.name].enabled"
            :disabled="!isCreateMode && addonDefinition.forbidDisable && addons[addonDefinition.name].enabled"
          ></v-checkbox>
        </v-flex>
        <v-flex>
          <div class="subheading font-weight-medium my-1" v-text="addonDefinition.title"/>
          <div class="addon-content mb-4" v-html="addonDefinition.description"/>
        </v-flex>
      </v-layout>
    </v-flex>
  </v-layout>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import filter from 'lodash/filter'
import cloneDeep from 'lodash/cloneDeep'
import { shootAddonList } from '@/utils'

export default {
  name: 'manage-shoot-addons',
  props: {
    isCreateMode: {
      type: Boolean,
      required: true
    }
  },
  data () {
    return {
      addons: {},
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
      this.addons = cloneDeep(addons)
    },
    resetAddonList (addons) {
      this.addonDefinitionList = filter(shootAddonList, addon => {
        return addon.visible === true || (addons && !!addons[addon.name])
      })
    }
  }
}
</script>

<style scoped>

.addon-content >>>  p {
  margin-bottom: 4px;
}

.addon-action {
  min-height: 50px;
  width: 56px;
  min-width: 56px;
  max-width: 56px;
  margin: 0;
}
</style>
