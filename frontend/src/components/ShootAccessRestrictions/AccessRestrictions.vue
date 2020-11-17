<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="definitions">
    <v-row v-for="(definition, index) in definitions" :key="definition.key">
      <v-list :class="{ 'grey lighten-5': index % 2 }">
        <v-list-item v-if="definition">
          <v-list-item-action class="action-select">
            <v-switch
              v-model="accessRestrictions[definition.key].value"
              color="cyan darken-2"
              inset
            ></v-switch>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title class="wrap-text" v-html="transformHtml(definition.input.title)"></v-list-item-title>
            <v-list-item-subtitle v-if="definition.input.description" class="wrap-text" v-html="transformHtml(definition.input.description)"></v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
        <template v-if="definition">
          <v-list-item v-for="optionValue in definition.options" :key="optionValue.key">
            <v-list-item-action class="action-select">
              <v-checkbox
                v-model="accessRestrictions[definition.key].options[optionValue.key].value"
                :disabled="!enabled(definition)"
                color="cyan darken-2"
              ></v-checkbox>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title class="wrap-text" :class="textClass(definition)" v-html="transformHtml(optionValue.input.title)"></v-list-item-title>
              <v-list-item-subtitle v-if="optionValue.input.description" class="wrap-text pt-n3" :class="textClass(definition)" v-html="transformHtml(optionValue.input.description)"></v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </template>
      </v-list>
    </v-row>
  </div>
  <div v-else class="pt-4">
    {{noItemsText}}
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import cloneDeep from 'lodash/cloneDeep'
import isEmpty from 'lodash/isEmpty'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'

import { transformHtml } from '@/utils'

export default {
  props: {
    userInterActionBus: {
      type: Object
    }
  },
  data () {
    return {
      accessRestrictions: undefined,
      cloudProfileName: undefined,
      region: undefined,
      shootResource: undefined
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    ...mapGetters([
      'accessRestrictionNoItemsTextForCloudProfileNameAndRegion',
      'accessRestrictionDefinitionsByCloudProfileNameAndRegion',
      'accessRestrictionsForShootByCloudProfileNameAndRegion',
      'labelsByCloudProfileNameAndRegion'
    ]),
    definitions () {
      return this.accessRestrictionDefinitionsByCloudProfileNameAndRegion({ cloudProfileName: this.cloudProfileName, region: this.region })
    },
    noItemsText () {
      return this.accessRestrictionNoItemsTextForCloudProfileNameAndRegion({ cloudProfileName: this.cloudProfileName, region: this.region })
    }
  },
  methods: {
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
      const enabled = this.enabled(definition)
      return enabled ? 'text--secondary' : 'text--disabled'
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
    }
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
  }
}

</script>

<style lang="scss" scoped>
  .wrap-text {
    white-space: normal;
  }

  .action-select {
    align-self: flex-start;
    min-width: 48px;
  }

</style>
