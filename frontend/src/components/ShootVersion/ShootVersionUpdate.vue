<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <hint-colorizer hintColor="orange">
      <v-select
        :items="items"
        color="cyan darken-2"
        class="mb-2"
        item-color="cyan darken-2"
        item-value="version"
        v-model="selectedItem"
        :label="label"
        :hint="hint"
        :error="isError"
        return-object
        placeholder="Please select version..."
      >
        <template v-slot:item="{ item }">
          <v-tooltip top :disabled="!item.notNextMinor">
            <template v-slot:activator="{ on }">
              <v-list-item-content v-on="on">
                <v-list-item-title v-if="!item.notNextMinor">{{item.text}}</v-list-item-title>
                <v-list-item-title v-else class="text--disabled">{{item.text}}</v-list-item-title>
                <v-list-item-subtitle v-if="versionItemDescription(item).length">
                  {{versionItemDescription(item)}}
                </v-list-item-subtitle>
              </v-list-item-content>
            </template>
            <span>You cannot upgrade your cluster more than one minor version at a time</span>
          </v-tooltip>
        </template>
      </v-select>
    </hint-colorizer>
    <v-alert type="warning" outlined v-if="currentK8sVersion.expirationDate && !selectedItem">Current Kubernetes version expires on: {{currentK8sVersion.expirationDateString}}. Kubernetes update will be enforced after that date.</v-alert>
  </div>
</template>

<script>
import map from 'lodash/map'
import flatMap from 'lodash/flatMap'
import upperFirst from 'lodash/upperFirst'
import head from 'lodash/head'
import get from 'lodash/get'
import join from 'lodash/join'
import semver from 'semver'
import HintColorizer from '@/components/HintColorizer'

export default {
  name: 'shoot-version-update',
  components: {
    HintColorizer
  },
  props: {
    availableK8sUpdates: {
      required: true
    },
    currentK8sVersion: {
      type: Object
    }
  },
  data () {
    return {
      snackbar: false,
      selectedItem: undefined
    }
  },
  computed: {
    items () {
      const selectionItemsForType = (versions, type) => {
        return map(versions, version => {
          return {
            ...version,
            type,
            text: `${this.currentK8sVersion.version} → ${version.version}`,
            notNextMinor: this.itemIsNotNextMinor(version.version, type)
          }
        })
      }
      const allVersionGroups = map(this.availableK8sUpdates, (versions, type) => selectionItemsForType(versions, type))
      const allItems = flatMap(allVersionGroups, (versionGroup) => {
        const type = head(versionGroup).type
        versionGroup.unshift({ header: upperFirst(type), type })
        return versionGroup
      })
      allItems.sort((a, b) => {
        if (a.type === b.type) {
          if (a.header) {
            return -1
          } else if (b.header) {
            return 1
          } else {
            if (semver.eq(a.version, b.version)) {
              return 0
            } else if (semver.gt(a.version, b.version)) {
              return 1
            } else {
              return -1
            }
          }
        } else {
          const sortValForType = function (type) {
            switch (type) {
              case 'patch':
                return 0
              case 'minor':
                return 1
              case 'major':
                return 2
              default:
                return 3
            }
          }
          if (sortValForType(a.type) === sortValForType(b.type)) {
            return 0
          } else {
            return sortValForType(a.type) < sortValForType(b.type) ? -1 : 1
          }
        }
      })

      return allItems
    },
    selectedVersionIsPatch () {
      const isPatch = get(this.selectedItem, 'type') === 'patch'
      this.$emit('confirmRequired', !isPatch)
      return isPatch
    },
    selectedMinorVersionIsNotNextMinor () {
      const version = get(this, 'selectedItem.version')
      const type = get(this, 'selectedItem.type')
      const invalid = !version || this.itemIsNotNextMinor(version, type)
      this.$emit('selectedVersionInvalid', invalid)
      return invalid
    },
    isError () {
      const selectedVersion = get(this, 'selectedItem.version')
      return selectedVersion && this.selectedMinorVersionIsNotNextMinor
    },
    label () {
      if (this.selectedVersionIsPatch) {
        return 'Patch to Version'
      }
      return 'Upgrade to Version'
    },
    hint () {
      if (!this.selectedItem) {
        return undefined
      }
      if (this.selectedMinorVersionIsNotNextMinor) {
        return 'You cannot upgrade your cluster more than one minor version at a time'
      }
      if (this.selectedItem.isPreview) {
        return 'Selected Version is a preview version. Preview versions have not yet undergone thorough testing. There is a higher probability of undiscovered issues and are therefore not recommended for production usage'
      }
      return undefined
    }
  },
  methods: {
    itemIsNotNextMinor (version, type) {
      if (!this.currentK8sVersion.version) {
        return false
      }
      let invalid = false
      if (version && type === 'minor') {
        const currentMinorVersion = semver.minor(this.currentK8sVersion.version)
        const selectedItemMinorVersion = semver.minor(version)
        invalid = selectedItemMinorVersion - currentMinorVersion !== 1
      }
      return invalid
    },
    versionItemDescription (version) {
      const itemDescription = []
      if (version.classification) {
        itemDescription.push(`Classification: ${version.classification}`)
      }
      if (version.expirationDate) {
        itemDescription.push(`Expiration Date: ${version.expirationDateString}`)
      }
      return join(itemDescription, ' | ')
    },
    reset () {
      this.selectedItem = undefined
    }
  },
  watch: {
    selectedItem (value) {
      const version = get(value, 'version')
      const type = get(value, 'type')
      this.$emit('selectedVersion', version)
      this.$emit('selectedVersionType', type)
    }
  }
}
</script>
