<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <hint-colorizer hintColor="orange">
    <v-select
      color="cyan darken-2"
      item-color="cyan darken-2"
      :items="machineTypeItems"
      item-text="name"
      item-value="name"
      :error-messages="getErrorMessages('worker.machine.type')"
      @input="onInputMachineType"
      @blur="$v.worker.machine.type.$touch()"
      v-model="worker.machine.type"
      label="Machine Type"
      :hint="hint"
      persistent-hint
    >
      <template v-slot:item="{ item }">
        <v-list-item-content>
          <v-list-item-title>{{item.name}}</v-list-item-title>
          <v-list-item-subtitle>
            <span v-if="item.cpu">CPU: {{item.cpu}} | </span>
            <span v-if="item.gpu">GPU: {{item.gpu}} | </span>
            <span v-if="item.memory">Memory: {{item.memory}}</span>
            <span v-if="item.volumeType && item.volumeSize"> | Volume Type: {{item.volumeType}} | Volume Size: {{item.volumeSize}}</span>
          </v-list-item-subtitle>
        </v-list-item-content>
      </template>
    </v-select>
  </hint-colorizer>
</template>

<script>
import HintColorizer from '@/components/HintColorizer'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import find from 'lodash/find'

const validationErrors = {
  worker: {
    machine: {
      type: {
        required: 'Machine Type is required'
      }
    }
  }
}

const validations = {
  worker: {
    machine: {
      type: {
        required
      }
    }
  }
}

export default {
  components: {
    HintColorizer
  },
  props: {
    worker: {
      type: Object,
      required: true
    },
    machineTypes: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      validationErrors,
      valid: undefined
    }
  },
  computed: {
    machineTypeItems () {
      const machineTypes = this.machineTypes.slice()
      if (this.notInCloudProfile) {
        machineTypes.push({
          name: this.worker.machine.type
        })
      }
      this.onInputMachineType()
      return machineTypes
    },
    notInCloudProfile () {
      return !find(this.machineTypes, ['name', this.worker.machine.type])
    },
    hint () {
      if (this.notInCloudProfile) {
        return 'This machine type may not be supported by your worker'
      }
      return undefined
    }
  },
  validations,
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputMachineType () {
      this.$v.worker.machine.type.$touch()
      this.$emit('updateMachineType', this.worker.machine.type)
      this.validateInput()
    },
    validateInput () {
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', { id: this.worker.id, valid: this.valid })
      }
    }
  },
  mounted () {
    this.$v.$touch()
    this.validateInput()
  }
}
</script>
