<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-select
    v-model="machineImage"
    color="primary"
    item-color="primary"
    :items="machineImageItems"
    item-value="key"
    return-object
    :error-messages="getErrorMessages(v$.worker.machine.image)"
    label="Machine Image"
    :hint="hint"
    persistent-hint
    variant="underlined"
    @update:model-value="onInputMachineImage"
    @blur="v$.worker.machine.image.$touch()"
  >
    <template #item="{ props, item }">
      <v-list-item
        v-bind="props"
        :title="undefined"
      >
        <template #prepend>
          <g-vendor-icon :icon="item.raw.icon" />
        </template>
        <v-list-item-title>Name: {{ item.raw.displayName }} | Version: {{ item.raw.version }}</v-list-item-title>
        <v-list-item-subtitle v-if="itemDescription(item.raw).length">
          {{ itemDescription(item.raw) }}
        </v-list-item-subtitle>
      </v-list-item>
    </template>
    <template #selection="{ item }">
      <g-vendor-icon :icon="item.raw.icon" />
      <span class="ml-2">
        {{ item.raw.displayName }} [{{ item.raw.version }}]
      </span>
    </template>
    <template #message="{ message }">
      <g-multi-message :message="message" />
    </template>
  </v-select>
</template>

<script>
import { required } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import GVendorIcon from '@/components/GVendorIcon'
import GMultiMessage from '@/components/GMultiMessage'

import {
  getErrorMessages,
  machineImageHasUpdateForAutoUpdateStrategy,
  transformHtml,
} from '@/utils'
import { withFieldName } from '@/utils/validators'

import join from 'lodash/join'
import find from 'lodash/find'
import pick from 'lodash/pick'

export default {
  components: {
    GVendorIcon,
    GMultiMessage,
  },
  props: {
    worker: {
      type: Object,
      required: true,
    },
    machineImages: {
      type: Array,
      default: () => [],
    },
    autoUpdate: {
      type: Boolean,
    },
    fieldName: {
      type: String,
    },
  },
  emits: [
    'updateMachineImage',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  computed: {
    machineImageItems () {
      const machineImages = [...this.machineImages]
      if (this.notInList) {
        machineImages.push({
          ...this.worker.machine.image,
          displayName: this.worker.machine.image.name,
          key: 'notInList',
        })
      }
      return machineImages
    },
    notInList () {
      // notInList: selected value may have been removed from cloud profile or other worker changes do not support current selection anymore
      return !find(this.machineImages, this.worker.machine.image)
    },
    machineImage: {
      get () {
        const { name, version } = this.worker.machine.image || {}
        return find(this.machineImageItems, { name, version }) || {}
      },
      set (machineImage) {
        this.worker.machine.image = pick(machineImage, ['name', 'version'])
      },
    },
    hint () {
      const hints = []
      if (this.machineImage.vendorHint) {
        hints.push({
          type: 'html',
          hint: transformHtml(this.machineImage.vendorHint.message),
          severity: this.machineImage.vendorHint.severity,
        })
      }
      if (this.machineImage.isExpirationWarning) {
        hints.push({
          type: 'text',
          hint: `Image version expires on: ${this.machineImage.expirationDateString}. Image update will be enforced after that date.`,
          severity: 'warning',
        })
      }
      if (this.machineImage.isPreview) {
        hints.push({
          type: 'text',
          hint: 'Preview versions have not yet undergone thorough testing. There is a higher probability of undiscovered issues and are therefore not recommended for production usage',
          severity: 'warning',
        })
      }
      if (this.machineImage.isDeprecated) {
        const hint = this.machineImage.expirationDate
          ? `This image version is deprecated. It will expire on ${this.machineImage.expirationDateString}`
          : 'This image version is deprecated'
        hints.push({
          type: 'text',
          hint,
          severity: 'warning',
        })
      }
      if (this.autoUpdate && this.machineImageHasUpdateForAutoUpdateStrategy) {
        hints.push({
          type: 'text',
          hint: 'You selected a version that is eligible for an automatic update. You should disable automatic operating system updates if you want to maintain this specific version',
          severity: 'info',
        })
      }
      if (this.notInList) {
        hints.push({
          type: 'text',
          hint: 'This image may not be supported by the selected machine type',
          severity: 'warning',
        })
      }
      return JSON.stringify(hints)
    },
    machineImageHasUpdateForAutoUpdateStrategy () {
      return machineImageHasUpdateForAutoUpdateStrategy(this.machineImage, this.machineImages)
    },
  },
  validations () {
    return {
      worker: {
        machine: {
          image: withFieldName(() => this.fieldName, {
            required,
          }),
        },
      },
    }
  },
  mounted () {
    this.v$.$touch()
  },
  methods: {
    onInputMachineImage () {
      this.v$.worker.machine.image.$touch()
      this.$emit('updateMachineImage', this.worker.machine.image)
    },
    itemDescription (machineImage) {
      const itemDescription = []
      if (machineImage.classification) {
        itemDescription.push(`Classification: ${machineImage.classification}`)
      }
      if (machineImage.expirationDate) {
        itemDescription.push(`Expiration Date: ${machineImage.expirationDateString}`)
      }
      return join(itemDescription, ' | ')
    },
    getErrorMessages,
  },
}
</script>
