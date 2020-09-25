<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <hint-colorizer hintColor="orange">
    <v-select
      color="cyan darken-2"
      item-color="cyan darken-2"
      :items="machineImages"
      item-value="key"
      return-object
      :error-messages="getErrorMessages('worker.machine.image')"
      @input="onInputMachineImage"
      @blur="$v.worker.machine.image.$touch()"
      v-model="machineImage"
      label="Machine Image"
      :hint="hint"
      persistent-hint
    >
      <template v-slot:item="{ item }">
        <v-list-item-action>
          <vendor-icon v-model="item.icon"></vendor-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>Name: {{item.name}} | Version: {{item.version}}</v-list-item-title>
          <v-list-item-subtitle v-if="itemDescription(item).length">
            {{itemDescription(item)}}
          </v-list-item-subtitle>
        </v-list-item-content>
      </template>
      <template v-slot:selection="{ item }">
        <vendor-icon v-model="item.icon"></vendor-icon>
        <span class="black--text ml-2">
         {{item.name}} [{{item.version}}]
        </span>
      </template>
    </v-select>
  </hint-colorizer>
</template>

<script>
import VendorIcon from '@/components/VendorIcon'
import HintColorizer from '@/components/HintColorizer'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, selectedImageIsNotLatest } from '@/utils'
import includes from 'lodash/includes'
import map from 'lodash/map'
import pick from 'lodash/pick'
import find from 'lodash/find'
import join from 'lodash/join'

const validationErrors = {
  worker: {
    machine: {
      image: {
        required: 'Machine Image is required'
      }
    }
  }
}

const validations = {
  worker: {
    machine: {
      image: {
        required
      }
    }
  }
}

export default {
  components: {
    VendorIcon,
    HintColorizer
  },
  props: {
    worker: {
      type: Object,
      required: true
    },
    machineImages: {
      type: Array,
      default: () => []
    },
    updateOSMaintenance: {
      type: Boolean
    }
  },
  data () {
    return {
      validationErrors,
      valid: undefined
    }
  },
  computed: {
    machineImage: {
      get () {
        const { name, version } = this.worker.machine.image || {}
        return find(this.machineImages, { name, version }) || {}
      },
      set (machineImage) {
        this.worker.machine.image = pick(machineImage, ['name', 'version'])
      }
    },
    hint () {
      const hintText = []
      if (this.machineImage.needsLicense) {
        hintText.push('The OS image selected requires a license and a contract for full enterprise support. By continuing you are confirming that you have a valid license and you have signed an enterprise support contract.')
      }
      if (this.machineImage.expirationDate) {
        hintText.push(`Image version expires on: ${this.machineImage.expirationDateString}. Image update will be enforced after that date.`)
      }
      if (this.updateOSMaintenance && this.selectedImageIsNotLatest) {
        hintText.push('If you select a version which is not the latest (except for preview versions), you should disable automatic operating system updates')
      }
      if (this.machineImage.isPreview) {
        hintText.push('Preview versions have not yet undergone thorough testing. There is a higher probability of undiscovered issues and are therefore not recommended for production usage')
      }
      return join(hintText, ' / ')
    },
    selectedImageIsNotLatest () {
      return selectedImageIsNotLatest(this.machineImage, this.machineImages)
    }
  },
  validations,
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputMachineImage () {
      this.$v.worker.machine.image.$touch()
      this.$emit('updateMachineImage', this.worker.machine.image)
      this.validateInput()
    },
    validateInput () {
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', { id: this.worker.id, valid: this.valid })
      }
    },
    itemDescription (machineImage) {
      const itemDescription = []
      if (machineImage.classification) {
        itemDescription.push(`Classification: ${machineImage.classification}`)
      }
      if (machineImage.needsLicense) {
        itemDescription.push('Enterprise support license required')
      }
      if (machineImage.expirationDate) {
        itemDescription.push(`Expiration Date: ${machineImage.expirationDateString}`)
      }
      return join(itemDescription, ' | ')
    }
  },
  mounted () {
    this.$v.$touch()
    this.validateInput()
  },
  watch: {
    machineImages (updatedMachineImages) {
      if (!includes(map(updatedMachineImages, 'name'), this.worker.machine.image)) {
        this.worker.machine.image = undefined
        this.onInputMachineImage()
      }
    }
  }
}
</script>
