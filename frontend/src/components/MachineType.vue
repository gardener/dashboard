<template>
  <v-select
    color="cyan darken-2"
    :items="machineTypes"
    item-text="name"
    item-value="name"
    :error-messages="getErrorMessages('worker.machineType')"
    @input="onInputMachineType"
    @blur="$v.worker.machineType.$touch()"
    v-model="worker.machineType"
    label="Machine Type"
  >
    <template slot="item" slot-scope="data">
      <v-list-tile-content>
        <v-list-tile-title>{{data.item.name}}</v-list-tile-title>
        <v-list-tile-sub-title>
          <span>CPU: {{data.item.cpu}} | GPU: {{data.item.gpu}} | Memory: {{data.item.memory}}</span>
          <span v-if="data.item.volumeType && data.item.volumeSize"> | Volume Type: {{data.item.volumeType}} | Volume Size: {{data.item.volumeSize}}</span>
        </v-list-tile-sub-title>
      </v-list-tile-content>
    </template>
  </v-select>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'

const validationErrors = {
  worker: {
    machineType: {
      required: 'Machine Type is required'
    }
  }
}

const validations = {
  worker: {
    machineType: {
      required
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
      this.$v.worker.machineType.$touch()
      this.$emit('updateMachineType', this.worker.machineType)
      this.validateInput()
    },
    validateInput () {
      this.valid = this.valid && this.worker.valid && !this.$v.$invalid
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
