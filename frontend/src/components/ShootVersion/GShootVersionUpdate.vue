<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-select
      v-model="selectedItem"
      v-messages-color="{ color: 'warning' }"
      :items="items"
      color="primary"
      class="mb-2"
      item-color="primary"
      item-value="version"
      :label="label"
      :hint="hint"
      return-object
      placeholder="Please select version..."
      :error-messages="errors.selectedItem"
      @blur="v$.selectedItem.$touch()"
    >
      <template #item="{ props }">
        <v-list-subheader
          v-if="props.value.type === 'subheader'"
          v-bind="props"
        />
        <div
          v-else
          :ref="`versionItem_${props.value.version}`"
        >
          <v-list-item
            v-bind="props"
            :subtitle="versionItemDescription(props.value)"
            :disabled="props.value.notNextMinor"
          >
            <template #subtitle="{ subtitle }">
              <div :class="props.value.subtitleClass">
                {{ subtitle }}
              </div>
            </template>
          </v-list-item>
        </div>
        <v-tooltip
          v-if="props.value.notNextMinor"
          :activator="$refs[`versionItem_${props.value.version}`]"
          location="top"
        >
          You cannot upgrade your cluster more than one minor version at a time
        </v-tooltip>
      </template>
    </v-select>
    <v-alert
      v-if="currentK8sVersion.expirationDate && !selectedItem"
      type="warning"
      variant="outlined"
    >
      Current Kubernetes version expires on: {{ currentK8sVersion.expirationDateString }}.
      Kubernetes update will be enforced after that date.
    </v-alert>
  </div>
</template>

<script>
import semver from 'semver'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import {
  allWithCauserParam,
  withMessage,
} from '@/utils/validators'
import { getVuelidateErrors } from '@/utils'

import {
  map,
  flatMap,
  upperFirst,
  head,
  get,
  join,
} from '@/lodash'
export default {
  props: {
    availableK8sUpdates: {
      type: Object,
      required: true,
    },
    currentK8sVersion: {
      type: Object,
    },
  },
  emits: [
    'selectedVersion',
    'selectedVersionType',
    'confirmRequired',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      snackbar: false,
      selectedItem: undefined,
    }
  },
  validations () {
    return {
      selectedItem: allWithCauserParam('Kubernetes Version', {
        required,
        selectedMinorVersionIsNotNextMinor: withMessage('You cannot upgrade your cluster more than one minor version at a time', value => {
          return !this.itemIsNotNextMinor(value.version, value.updateType)
        }),
      }),
    }
  },
  computed: {
    items () {
      const selectionItemsForType = (versions, updateType) => {
        return map(versions, version => {
          const notNextMinor = this.itemIsNotNextMinor(version.version, updateType)
          let subtitleClass = ''
          if (version.isSupported) {
            subtitleClass = 'text-success'
          }
          if (version.isDeprecated) {
            subtitleClass = 'text-warning'
          }
          if (notNextMinor) {
            subtitleClass = 'text-disabled'
          }
          return {
            ...version,
            updateType,
            title: `${this.currentK8sVersion.version} → ${version.version}`,
            notNextMinor,
            subtitleClass,
          }
        })
      }
      const allVersionGroups = map(this.availableK8sUpdates, selectionItemsForType)
      const allItems = flatMap(allVersionGroups, versionGroup => {
        const updateType = head(versionGroup).updateType
        versionGroup.unshift({
          title: upperFirst(updateType),
          type: 'subheader',
          updateType,
        })
        return versionGroup
      })
      allItems.sort((a, b) => {
        if (a.updateType === b.updateType) {
          if (a.type === 'subheader') {
            return -1
          } else if (b.type === 'subheader') {
            return 1
          }
          if (semver.diff(a.version, b.version) === 'patch') {
            if (a.isSupported && !b.isSupported) {
              return -1
            }
            if (!a.isSupported && b.isSupported) {
              return 1
            }
          }
          if (semver.eq(a.version, b.version)) {
            return 0
          } else if (semver.gt(a.version, b.version)) {
            return 1
          } else {
            return -1
          }
        } else {
          const sortValForType = updateType => {
            switch (updateType) {
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
          if (sortValForType(a.updateType) === sortValForType(b.updateType)) {
            return 0
          } else {
            return sortValForType(a.updateType) < sortValForType(b.updateType) ? -1 : 1
          }
        }
      })
      return allItems
    },
    selectedVersionIsPatch () {
      const isPatch = get(this.selectedItem, 'updateType') === 'patch'
      this.$emit('confirmRequired', !isPatch)
      return isPatch
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
      if (this.selectedItem.isPreview) {
        return 'Selected Version is a preview version. Preview versions have not yet undergone thorough testing. There is a higher probability of undiscovered issues and are therefore not recommended for production usage'
      }
      return undefined
    },
    errors () {
      return getVuelidateErrors(this.v$.$errors)
    },
  },
  watch: {
    selectedItem (value) {
      this.$emit('selectedVersion', value?.version)
      this.$emit('selectedVersionType', value?.updateType)
    },
  },
  methods: {
    itemIsNotNextMinor (version, updateType) {
      if (!this.currentK8sVersion.version) {
        return false
      }
      let invalid = false
      if (version && updateType === 'minor') {
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
      return itemDescription.length
        ? join(itemDescription, ' | ')
        : undefined
    },
    reset () {
      this.selectedItem = undefined
    },
  },
}
</script>
