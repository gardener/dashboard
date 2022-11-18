<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <hint-colorizer hint-color="warning">
    <v-autocomplete
      color="primary"
      item-color="primary"
      :items="machineTypeItems"
      item-text="name"
      item-value="name"
      :error-messages="getErrorMessages('worker.machine.type')"
      @input="onInputMachineType"
      @blur="$v.worker.machine.type.$touch()"
      v-model="worker.machine.type"
      :filter="machineTypeFilter"
      label="Machine Type"
      :hint="hint"
      persistent-hint
    >
      <template v-slot:item="{ item }">
        <v-list-item-content>
          <v-list-item-title>
            {{item.name}}
          </v-list-item-title>
          <v-list-item-subtitle>
            <span v-if="item.cpu">CPU: {{item.cpu}} | </span>
            <span v-if="item.gpu">GPU: {{item.gpu}} | </span>
            <span v-if="item.memory">Memory: {{item.memory}}</span>
            <span v-if="item.storage"> | Volume Type: {{item.storage.type}} | Class: {{item.storage.class}} | Default Size: {{item.storage.size}}</span>
          </v-list-item-subtitle>
        </v-list-item-content>
      </template>
      <template v-slot:selection="{ item }">
         {{item.name}}
      </template>
    </v-autocomplete>
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
      const machineTypes = [...this.machineTypes]
      if (this.notInList) {
        machineTypes.push({
          name: this.worker.machine.type
        })
      }
      return machineTypes
    },
    notInList () {
      // notInList: selected value may have been removed from cloud profile or other worker changes do not support current selection anymore
      return !find(this.machineTypes, ['name', this.worker.machine.type])
    },
    hint () {
      if (this.notInList) {
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
      this.$emit('update-machine-type', this.worker.machine.type)
      this.validateInput()
    },
    validateInput () {
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', { id: this.worker.id, valid: this.valid })
      }
    },
    machineTypeFilter (item, query) {
      if (!item) {
        return false
      }
      if (typeof query !== 'string') {
        return true
      }
      const { name, cpu, gpu, memory } = item
      const terms = query.split(/\s+/)
      return terms.every(term => name?.includes(term) || [cpu, gpu, memory].includes(term))
    }
  },
  mounted () {
    this.$v.$touch()
    this.validateInput()
  }
}
</script>
