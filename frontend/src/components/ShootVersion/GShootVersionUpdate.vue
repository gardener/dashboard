<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-select
      v-model="v$.selectedItem.$model"
      v-messages-color="{ color: hintColor }"
      :items="visibleItems"
      color="primary"
      class="mb-2"
      item-color="primary"
      item-value="version"
      :label="label"
      :hint="hint"
      return-object
      placeholder="Please select version..."
      persistent-hint
      :error-messages="getErrorMessages(v$.selectedItem)"
      @blur="v$.selectedItem.$touch()"
    >
      <template #item="{ item, props }">
        <v-list-subheader
          v-if="item.raw.type === 'subheader'"
          :title="item.title"
        />
        <v-list-item
          v-else
          v-bind="props"
          :subtitle="versionItemDescription(item.raw)"
        >
          <template #subtitle="{ subtitle }">
            <div :class="item.raw.subtitleClass">
              {{ subtitle }}
            </div>
          </template>
        </v-list-item>
      </template>
    </v-select>
    <v-alert
      v-if="shootKubernetesVersionObject.isExpirationWarning && !selectedItem"
      type="warning"
      variant="tonal"
    >
      Current Kubernetes version expires
      <g-time-string
        :date-time="shootKubernetesVersionObject.expirationDate"
        mode="future"
        date-tooltip
      />.
      Kubernetes update will be enforced after that date.
    </v-alert>
  </div>
</template>

<script>
import {
  ref,
  computed,
} from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import semver from 'semver'

import { useShootItem } from '@/composables/useShootItem'

import { withFieldName } from '@/utils/validators'
import { getErrorMessages } from '@/utils'

import {
  map,
  flatMap,
  upperFirst,
  head,
  get,
  join,
  filter,
} from '@/lodash'

export default {
  props: {
    modelValue: {
      type: Object,
      default: null,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup (props, { emit }) {
    const {
      shootKubernetesVersionObject,
      shootAvailableK8sUpdates,
    } = useShootItem()

    const snackbar = ref(false)
    const selectedItem = computed({
      get () {
        return props.modelValue
      },
      set (value) {
        emit('update:modelValue', value)
      },
    })

    const rules = {
      selectedItem: withFieldName('Kubernetes Version', {
        required,
      }),
    }

    return {
      v$: useVuelidate(rules, { selectedItem }),
      shootKubernetesVersionObject,
      shootAvailableK8sUpdates,
      snackbar,
      selectedItem,
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
            title: `${this.shootKubernetesVersionObject.version} → ${version.version}`,
            notNextMinor,
            subtitleClass,
          }
        })
      }
      const allVersionGroups = map(this.shootAvailableK8sUpdates, selectionItemsForType)
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
    visibleItems () {
      return filter(this.items, item => !item.notNextMinor)
    },
    hasMoreSupportedVersions () {
      return filter(this.items, item => item.notNextMinor && item.isSupported).length > 0
    },
    selectedVersionIsPatch () {
      return get(this.selectedItem, 'updateType') === 'patch'
    },
    label () {
      if (this.selectedVersionIsPatch) {
        return 'Patch to version'
      }
      return 'Upgrade to version'
    },
    hint () {
      if (this.selectedItem?.isPreview) {
        return 'Selected version is a preview version. Preview versions have not yet undergone thorough testing. There is a higher probability of undiscovered issues and are therefore not recommended for production usage'
      }
      if (this.selectedItem?.isDeprecated) {
        return `Selected version is deprecated. It will expire on ${this.selectedItem.expirationDateString}`
      }
      if (this.hasMoreSupportedVersions) {
        return 'There are newer minor versions available. However you can only upgrade your cluster one minor version at a time'
      }
      return undefined
    },
    hintColor () {
      if (this.selectedItem?.isPreview || this.selectedItem?.isDeprecated) {
        return 'warning'
      }
      if (this.hasMoreSupportedVersions) {
        return 'info'
      }
      return undefined
    },
  },
  methods: {
    itemIsNotNextMinor (version, updateType) {
      if (!this.shootKubernetesVersionObject.version) {
        return false
      }
      let invalid = false
      if (version && updateType === 'minor') {
        const currentMinorVersion = semver.minor(this.shootKubernetesVersionObject.version)
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
    getErrorMessages,
  },
}
</script>
