<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <v-select
    color="primary"
    item-color="primary"
    :items="machineImageItems"
    item-value="key"
    return-object
    :error-messages="getErrorMessages('worker.machine.image')"
    @input="onInputMachineImage"
    @blur="v$.worker.machine.image.$touch()"
    v-model="machineImage"
    label="Machine Image"
    :hint="hint"
    persistent-hint
    variant="underlined"
  >
    <template #item="{ props, item }">
      <v-list-item v-bind="props" :title="undefined">
        <template #prepend>
          <g-vendor-icon :icon="item.raw.icon"></g-vendor-icon>
        </template>
        <v-list-item-title>Name: {{ item.raw.name }} | Version: {{ item.raw.version }}</v-list-item-title>
        <v-list-item-subtitle v-if="itemDescription(item).length">
          {{ itemDescription(item.raw) }}
        </v-list-item-subtitle>
      </v-list-item>
    </template>
    <template #selection="{ item }">
      <g-vendor-icon :icon="item.raw.icon"></g-vendor-icon>
      <span class="ml-2">
        {{item.raw.name}} [{{item.raw.version}}]
      </span>
    </template>
    <template #message="{ message }">
      <g-multi-message :message="message" />
    </template>
  </v-select>
</template>

<script>
import { defineComponent } from 'vue'
import GVendorIcon from '@/components/GVendorIcon'
import GMultiMessage from '@/components/GMultiMessage'
import { required } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import { getValidationErrors, selectedImageIsNotLatest, transformHtml } from '@/utils'
import pick from 'lodash/pick'
import find from 'lodash/find'
import join from 'lodash/join'

const validationErrors = {
  worker: {
    machine: {
      image: {
        required: 'Machine Image is required',
      },
    },
  },
}

export default defineComponent({
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
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
    updateOSMaintenance: {
      type: Boolean,
    },
  },
  emits: [
    'updateMachineImage',
    'valid',
  ],
  data () {
    return {
      validationErrors,
      valid: undefined,
    }
  },
  computed: {
    machineImageItems () {
      const machineImages = [...this.machineImages]
      if (this.notInList) {
        machineImages.push({
          ...this.worker.machine.image,
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
      if (this.machineImage.expirationDate) {
        hints.push({
          type: 'text',
          hint: `Image version expires on: ${this.machineImage.expirationDateString}. Image update will be enforced after that date.`,
          severity: 'warning',
        })
      }
      if (this.updateOSMaintenance && this.selectedImageIsNotLatest) {
        hints.push({
          type: 'text',
          hint: 'If you select a version which is not the latest (except for preview versions), you should disable automatic operating system updates',
          severity: 'info',
        })
      }
      if (this.updateOSMaintenance && this.machineImage.isPreview) {
        hints.push({
          type: 'text',
          hint: 'Preview versions have not yet undergone thorough testing. There is a higher probability of undiscovered issues and are therefore not recommended for production usage',
          severity: 'warning',
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
    hintColor () {
      if (this.machineImage.expirationDate ||
         (this.updateOSMaintenance && this.selectedImageIsNotLatest) ||
         this.machineImage.isPreview) {
        return 'warning'
      }
      if (this.machineImage.vendorHint) {
        return this.machineImage.vendorHint.hintType
      }
      return undefined
    },
    selectedImageIsNotLatest () {
      return selectedImageIsNotLatest(this.machineImage, this.machineImages)
    },
    validators () {
      return {
        worker: {
          machine: {
            image: {
              required,
            },
          },
        },
      }
    },
  },
  validations () {
    return this.validators
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputMachineImage () {
      this.v$.worker.machine.image.$touch()
      this.$emit('updateMachineImage', this.worker.machine.image)
      this.validateInput()
    },
    validateInput () {
      if (this.valid !== !this.v$.$invalid) {
        this.valid = !this.v$.$invalid
        this.$emit('valid', { id: this.worker.id, valid: this.valid })
      }
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
  },
  mounted () {
    this.v$.$touch()
    this.validateInput()
  },
})
</script>

<style lang="scss" scoped>

  ::v-deep .v-select__slot {
    div {
     flex-wrap: nowrap;
    }
  }

</style>