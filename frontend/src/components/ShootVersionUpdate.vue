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
    <v-container fluid>
      <v-layout row wrap>
        <v-flex xs12>
          <v-select
            :items="items"
            item-text="version"
            v-model="selectedItem"
            :label="label"
          >
          <template slot="item" slot-scope="data">
             <v-list-tile-content>
               <v-list-tile-title>{{data.item.version}}</v-list-tile-title>
             </v-list-tile-content>
           </template>
          </v-select>
          <v-alert type="error" :value="selectedMinorVersionIsNotNextMinor" outline>
            You cannot directly upgrade cluster Kubernetes version to <code>{{this.selectedVersion}}</code><br />
            Please upgrade to a lower Kubernetes version first.
          </v-alert>
          <v-alert type="warning" :value="!selectedMinorVersionIsNotNextMinor && !selectedVersionIsPatch" outline>Before updating, please make sure that your cluster is compatible with the seleced Kubernetes version</v-alert>
        </v-flex>
      </v-layout>
    </v-container>
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
        const selectionItemsForType = function (versions, type) {
          return map(versions, version => {
            return {type,
              version
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
            } else {
              if (semver.gt(a.version, b.version)) {
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
            return sortValForType(a) < sortValForType(b) ? -1 : 1
          }
        })

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
        const invalid = get(this.selectedItem, 'type') === 'minor' &&
          find(this.items, item => {
            return item.type === 'minor' &&
            item.version !== undefined &&
            (semver.lt(item.version, this.selectedItem.version))
          })
        this.$emit('update:selectedVersionInvalid', !!invalid)
        return !!invalid
      },
      label () {
        if (this.selectedVersionIsPatch) {
          return 'Patch to Version'
        }
        return 'Update to Version'
      }
    },
    watch: {
      selectedItem (value) {
        const version = get(value, 'version')
        this.$emit('update:selectedVersion', version)
      }
    }
  }
</script>
