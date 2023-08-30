<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="!workerless">
    <v-row
      v-for="addonDefinition in addonDefinitionList"
      :key="addonDefinition.name"
    >
      <div class="d-flex ma-3">
        <div class="action-select">
          <v-checkbox
            v-model="addons[addonDefinition.name].enabled"
            color="primary"
            :disabled="!createMode && addonDefinition.forbidDisable && addons[addonDefinition.name].enabled"
            density="compact"
          />
        </div>
        <div
          class="d-flex flex-column"
          :class="textClass(addonDefinition)"
        >
          <div class="wrap-text text-subtitle-2">
            {{ addonDefinition.title }}
          </div>
          <div class="wrap-text pt-1 text-body-2">
            {{ addonDefinition.description }}
          </div>
        </div>
      </div>
    </v-row>
  </div>
</template>

<script>
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'
import { useShootStagingStore } from '@/store/shootStaging'

import { shootAddonList } from '@/utils'

import {
  filter,
  cloneDeep,
  isEmpty,
  forEach,
  set,
} from '@/lodash'

export default {
  props: {
    createMode: {
      type: Boolean,
      default: false,
    },
  },
  data () {
    return {
      addons: {},
      addonDefinitionList: undefined,
    }
  },
  computed: {
    ...mapState(useProjectStore, [
      'projectList',
    ]),
    ...mapState(useAuthzStore, [
      'namespace',
    ]),
    ...mapState(useShootStagingStore, [
      'workerless',
    ]),
  },
  watch: {
    workerless (value) {
      if (!value && isEmpty(this.addons)) {
        // If addons missing (navigated to overview tab from yaml), reset to defaults
        const addonDefinitions = filter(this.addonDefinitionList, 'visible')
        this.addons = {}
        for (const { name, enabled } of addonDefinitions) {
          this.addons[name] = { enabled }
        }
      }
    },
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
    },
    textClass (addonDefinition) {
      return !this.createMode && addonDefinition.forbidDisable && this.addons[addonDefinition.name].enabled
        ? 'text-disabled'
        : 'text-secondary'
    },
  },
}
</script>

<style lang="scss" scoped>
.action-select {
  min-width: 48px;
}
</style>
