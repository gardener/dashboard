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
      <div
        class="d-flex ma-3"
      >
        <div class="action-select">
          <v-checkbox
            v-model="lazyAddons[addonDefinition.name].enabled"
            color="primary"
            :disabled="!createMode && addonDefinition.forbidDisable && lazyAddons[addonDefinition.name].enabled"
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
import {
  mapState,
  mapWritableState,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'
import { useShootContextStore } from '@/store/shootContext'

import { shootAddonList } from '@/utils'

import {
  filter,
  cloneDeep,
  isEqual,
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
      lazyAddons: {},
    }
  },
  computed: {
    ...mapState(useProjectStore, [
      'projectList',
    ]),
    ...mapState(useAuthzStore, [
      'namespace',
    ]),
    ...mapState(useShootContextStore, [
      'workerless',
    ]),
    ...mapWritableState(useShootContextStore, [
      'addons',
    ]),
    addonDefinitionList () {
      return filter(shootAddonList, ({ name, visible }) => visible || !!this.lazyAddons?.[name])
    },
  },
  watch: {
    lazyAddons: {
      handler (value) {
        this.addons = cloneDeep(value)
      },
      deep: true,
    },
    addons: {
      handler (value) {
        if (!isEqual(this.lazyAddons, value)) {
          this.lazyAddons = cloneDeep(value)
        }
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    textClass (addonDefinition) {
      return !this.createMode && addonDefinition.forbidDisable && this.lazyAddons[addonDefinition.name].enabled
        ? 'text-disabled'
        : 'text-medium-emphasis'
    },
  },
}
</script>

<style lang="scss" scoped>
.action-select {
  min-width: 48px;
}
</style>
