<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="definitions"
    class="alternate-row-background"
  >
    <v-row
      v-for="(definition) in definitions"
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
            inset
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
    {{ noItemsText }}
  </div>
</template>

<script>
import { mapActions } from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'

import { transformHtml } from '@/utils'

import {
  cloneDeep,
  isEmpty,
  get,
  set,
  unset,
} from '@/lodash'

export default {
  props: {
    userInterActionBus: {
      type: Object,
    },
  },
  data () {
    return {
      accessRestrictions: undefined,
      cloudProfileName: undefined,
      region: undefined,
      shootResource: undefined,
    }
  },
  computed: {
    definitions () {
      return this.accessRestrictionDefinitionsByCloudProfileNameAndRegion({ cloudProfileName: this.cloudProfileName, region: this.region })
    },
    noItemsText () {
      return this.accessRestrictionNoItemsTextForCloudProfileNameAndRegion({ cloudProfileName: this.cloudProfileName, region: this.region })
    },
  },
  mounted () {
    if (this.userInterActionBus) {
      this.userInterActionBus.on('updateCloudProfileName', cloudProfileName => {
        this.setAccessRestrictions({ shootResource: this.shootResource, cloudProfileName, region: this.region })
      })
      this.userInterActionBus.on('updateRegion', region => {
        this.setAccessRestrictions({ shootResource: this.shootResource, cloudProfileName: this.cloudProfileName, region })
      })
    }
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'accessRestrictionNoItemsTextForCloudProfileNameAndRegion',
      'accessRestrictionDefinitionsByCloudProfileNameAndRegion',
      'accessRestrictionsForShootByCloudProfileNameAndRegion',
      'labelsByCloudProfileNameAndRegion',
    ]),
    transformHtml (value) {
      return transformHtml(value)
    },
    setAccessRestrictions ({ shootResource, cloudProfileName, region }) {
      this.shootResource = shootResource
      this.cloudProfileName = cloudProfileName
      this.region = region

      const accessRestrictions = this.accessRestrictionsForShootByCloudProfileNameAndRegion({ shootResource, cloudProfileName, region })
      this.accessRestrictions = cloneDeep(accessRestrictions)
    },
    enabled (definition) {
      const inverted = definition.input.inverted
      const value = this.accessRestrictions[definition.key].value
      return inverted ? !value : value
    },
    textClass (definition) {
      return this.enabled(definition)
        ? 'text-secondary'
        : 'text-disabled'
    },
    applyTo (shootResource) {
      const definitions = this.definitions || []
      const accessRestrictions = this.accessRestrictions || {}
      for (const { key, input, options: optionDefinitions } of definitions) {
        const { value, options } = accessRestrictions[key]
        const { inverted = false } = input
        const accessRestrictionEnabled = inverted ? !value : value
        if (accessRestrictionEnabled) {
          set(shootResource, ['spec', 'seedSelector', 'matchLabels', key], 'true')
        } else {
          unset(shootResource, ['spec', 'seedSelector', 'matchLabels', key])
        }

        for (const { key, input } of optionDefinitions) {
          const { value } = options[key]
          const { inverted = false } = input
          const optionEnabled = inverted ? !value : value
          if (accessRestrictionEnabled) {
            set(shootResource, ['metadata', 'annotations', key], `${optionEnabled}`)
          } else {
            unset(shootResource, ['metadata', 'annotations', key])
          }
        }
      }

      if (isEmpty(get(shootResource, 'spec.seedSelector.matchLabels'))) {
        unset(shootResource, 'spec.seedSelector.matchLabels')
      }
      if (isEmpty(get(shootResource, 'spec.seedSelector'))) {
        unset(shootResource, 'spec.seedSelector')
      }

      return shootResource
    },
  },
}
</script>

<style lang="scss" scoped>

  .action-select {
    min-width: 68px;
  }

</style>

