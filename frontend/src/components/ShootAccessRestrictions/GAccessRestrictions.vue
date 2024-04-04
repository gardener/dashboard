<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="accessRestrictionDefinitions"
    class="alternate-row-background"
  >
    <v-row
      v-for="definition in accessRestrictionDefinitions"
      :key="definition.key"
      class="my-0"
    >
      <div
        v-if="definition"
        class="d-flex ma-3"
      >
        <div class="action-select">
          <v-switch
            v-model="accessRestrictions[definition.key].value"
            color="primary"
            density="compact"
          />
        </div>
        <div>
          <span class="wrap-text text-subtitle-2">{{ definition.input.title }}</span>
          <!-- eslint-disable vue/no-v-html -->
          <span
            v-if="definition.input.description"
            class="wrap-text pt-1 text-body-2"
            v-html="transformHtml(definition.input.description)"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
      </div>
      <template v-if="definition">
        <div
          v-for="optionValue in definition.options"
          :key="optionValue.key"
          class="d-flex ma-3"
        >
          <div class="action-select">
            <v-checkbox
              v-model="accessRestrictions[definition.key].options[optionValue.key].value"
              :disabled="!enabled(definition)"
              color="primary"
              density="compact"
            />
          </div>
          <div>
            <span
              class="wrap-text text-subtitle-2"
              :class="textClass(definition)"
            >
              {{ optionValue.input.title }}
            </span>
            <!-- eslint-disable vue/no-v-html -->
            <span
              v-if="optionValue.input.description"
              class="wrap-text pt-1 text-body-2"
              :class="textClass(definition)"
              v-html="transformHtml(optionValue.input.description)"
            />
            <!-- eslint-enable vue/no-v-html -->
          </div>
        </div>
      </template>
    </v-row>
  </div>
  <div
    v-else
    class="pt-4"
  >
    {{ accessRestrictionNoItemsText }}
  </div>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import { useShootContextStore } from '@/store/shootContext'
import { NAND } from '@/store/shootContext/helper'

import { transformHtml } from '@/utils'

import { cloneDeep } from '@/lodash'

export default {
  data () {
    return {
      accessRestrictions: cloneDeep(this.getAccessRestrictions()),
    }
  },
  computed: {
    ...mapState(useShootContextStore, [
      'accessRestrictionDefinitions',
      'accessRestrictionNoItemsText',
    ]),
  },
  watch: {
    accessRestrictions: {
      handler (value) {
        this.setAccessRestrictions(value)
      },
      deep: true,
    },
  },
  methods: {
    ...mapActions(useShootContextStore, [
      'getAccessRestrictions',
      'setAccessRestrictions',
    ]),
    enabled ({ key, input }) {
      const value = this.accessRestrictions[key].value
      return NAND(value, !!input?.inverted)
    },
    textClass (definition) {
      return this.enabled(definition)
        ? 'text-medium-emphasis'
        : 'text-disabled'
    },
    transformHtml,
  },
}
</script>

<style lang="scss" scoped>

  .action-select {
    min-width: 68px;
  }

</style>
