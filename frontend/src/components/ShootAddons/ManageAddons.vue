<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list two-line>
    <v-list-item v-for="addonDefinition in addonDefinitionList" :key="addonDefinition.name">
      <v-list-item-action class="align-self-start">
        <v-checkbox
          color="cyan darken-2"
          v-model="addons[addonDefinition.name].enabled"
          :disabled="!isCreateMode && addonDefinition.forbidDisable && addons[addonDefinition.name].enabled"
        ></v-checkbox>
      </v-list-item-action>
      <v-list-item-content  class="align-self-start">
        <v-list-item-title class="mb-2">{{addonDefinition.title}}</v-list-item-title>
        <v-list-item-subtitle class="d-flex flex-column g-subtitle">{{addonDefinition.description}}</v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
  </v-list>
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

.g-subtitle {
  white-space: normal;
}

.g-subtitle ::v-deep  p {
  margin-bottom: 4px;
}

</style>
