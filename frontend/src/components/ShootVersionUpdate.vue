<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-select
    :items="items"
    v-model="selectedItem"
    :label="label"
    color="cyan darken-2"
    :hint="hint"
    :error="selectedMinorVersionIsNotNextMinor"
  >
  <template slot="item" slot-scope="data">
    <v-tooltip top :disabled="!data.item.notNextMinor">
      <v-list-tile-content slot="activator">
        <v-list-tile-title v-if="!data.item.notNextMinor">{{data.item.text}}</v-list-tile-title>
        <v-list-tile-title v-else class="text--disabled">{{data.item.text}}</v-list-tile-title>
      </v-list-tile-content>
      <span>You cannot upgrade your cluster more than one minor version at a time</span>
    </v-tooltip>
  </template>
  </v-select>
</template>



<script>
  import map from 'lodash/map'
  import flatMap from 'lodash/flatMap'
  import upperFirst from 'lodash/upperFirst'
  import head from 'lodash/head'
  import get from 'lodash/get'
  import find from 'lodash/find'
  import semver from 'semver'

  export default {
    props: {
      availableK8sUpdates: {
        required: true
      },
      selectedVersion: {
        type: String
      },
      selectedVersionInvalid: {
        type: Boolean,
        default: false
      },
      confirmRequired: {
        type: Boolean
      },
      currentk8sVersion: {
        type: String
      }
    },
    data () {
      return {
        snackbar: false,
        selectedItem: null
      }
    },
    computed: {
      items () {
        const selectionItemsForType = (versions, type) => {
          return map(versions, version => {
            return {type,
              version,
              text: `${this.currentk8sVersion} → ${version}`,
              notNextMinor: this.itemIsNotNextMinor(version, type)
            }
          })
        }
        const allVersionGroups = map(this.availableK8sUpdates, (versions, type) => selectionItemsForType(versions, type))
        const allItems = flatMap(allVersionGroups, (versionGroup) => {
          const type = head(versionGroup).type
          versionGroup.unshift({header: upperFirst(type), type})
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

        // cannot do in mount as need to reset selected item in case component gets reused, e.g. when the user switches from yaml back to ovweview
        // eslint-disable-next-line lodash/matches-prop-shorthand
        this.selectedItem = find(allItems, item => { return item.header === undefined })

        return allItems
      },
      selectedVersionIsPatch () {
        const isPatch = get(this.selectedItem, 'type') === 'patch'
        this.$emit('update:confirmRequired', !isPatch)
        return isPatch
      },
      selectedMinorVersionIsNotNextMinor () {
        const version = get(this, 'selectedItem.version')
        const type = get(this, 'selectedItem.type')
        let invalid = this.itemIsNotNextMinor(version, type)
        this.$emit('update:selectedVersionInvalid', invalid)
        return invalid
      },
      label () {
        if (this.selectedVersionIsPatch) {
          return 'Patch to Version'
        }
        return 'Upgrade to Version'
      },
      hint () {
        return this.selectedMinorVersionIsNotNextMinor ? 'You cannot upgrade your cluster more than one minor version at a time' : ''
      }
    },
    methods: {
      itemIsNotNextMinor (version, type) {
        if (!this.currentk8sVersion) {
          return false
        }
        let invalid = false
        if (version && type === 'minor') {
          const currentMinorVersion = semver.minor(this.currentk8sVersion)
          const selectedItemMinorVersion = semver.minor(version)
          invalid = selectedItemMinorVersion - currentMinorVersion !== 1
        }
        return invalid
      }
    },
    watch: {
      selectedItem (value) {
        const version = get(value, 'version')
        this.$emit('update:selectedVersion', version)
      },
      selectedVersion (value) {
        if (!value) {
          // eslint-disable-next-line lodash/matches-prop-shorthand
          this.selectedItem = find(this.items, item => { return item.header === undefined })
        }
      }
    }
  }
</script>