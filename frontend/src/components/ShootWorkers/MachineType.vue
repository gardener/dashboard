<template>
  <v-select
    color="cyan darken-2"
    :items="machineTypes"
    item-text="name"
    item-value="name"
    :error-messages="getErrorMessages('worker.machine.type')"
    @input="onInputMachineType"
    @blur="$v.worker.machine.type.$touch()"
    v-model="worker.machine.type"
    label="Machine Type"
  >
    <template v-slot:item="{ item }">
      <v-list-tile-content>
        <v-list-tile-title>{{item.name}}</v-list-tile-title>
        <v-list-tile-sub-title>
          <span>CPU: {{item.cpu}} | GPU: {{item.gpu}} | Memory: {{item.memory}}</span>
          <span v-if="item.volumeType && item.volumeSize"> | Volume Type: {{item.volumeType}} | Volume Size: {{item.volumeSize}}</span>
        </v-list-tile-sub-title>
      </v-list-tile-content>
    </template>
  </v-select>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import includes from 'lodash/includes'
import map from 'lodash/map'

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
  },
  watch: {
    machineTypes (updatedMachineTypes) {
      if (!includes(map(updatedMachineTypes, 'name'), this.worker.machine.type)) {
        this.worker.machine.type = undefined
        this.onInputMachineType()
      }
    }
  }
}
</script>
